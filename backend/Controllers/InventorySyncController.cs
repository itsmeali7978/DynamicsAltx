using System;
using System.Collections.Generic;
using System.Data;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InventorySyncController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public InventorySyncController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public class TableSyncDefinition
        {
            public string TableKey { get; set; } = string.Empty;
            public string LocalTableName { get; set; } = string.Empty;
            public string DisplayName { get; set; } = string.Empty;
            public string NavTableName { get; set; } = string.Empty;
            public string NavCountQuery { get; set; } = string.Empty;
            public string NavSelectQuery { get; set; } = string.Empty;
            public List<string> Columns { get; set; } = new List<string>();
        }

        private static readonly Dictionary<string, TableSyncDefinition> Definitions = new(StringComparer.OrdinalIgnoreCase)
        {
            ["items"] = new TableSyncDefinition
            {
                TableKey = "items",
                LocalTableName = "Altx Inv Items",
                DisplayName = "Altx Inv Items",
                NavTableName = "Item",
                NavCountQuery = "SELECT COUNT(1) FROM [dbo].[House Care Live$Item] WHERE [No_] IS NOT NULL AND RTRIM(LTRIM([No_])) <> ''",
                NavSelectQuery = @"
                    SELECT 
                        RTRIM(LTRIM([No_])) AS [ItemNo],
                        ISNULL([Description], '') AS [ArabicName],
                        ISNULL([Description 2], '') AS [EnglishName],
                        ISNULL(RTRIM(LTRIM([Base Unit of Measure])), '') AS [BaseUOM]
                    FROM [dbo].[House Care Live$Item]
                    WHERE [No_] IS NOT NULL AND RTRIM(LTRIM([No_])) <> ''",
                Columns = new List<string> { "ItemNo", "ArabicName", "EnglishName", "BaseUOM" }
            },
            ["itemuom"] = new TableSyncDefinition
            {
                TableKey = "itemuom",
                LocalTableName = "Altx Inv ItemUOM",
                DisplayName = "Altx Inv ItemUOM",
                NavTableName = "Item Unit of Measure",
                NavCountQuery = "SELECT COUNT(1) FROM [dbo].[House Care Live$Item Unit of Measure] WHERE [Item No_] IS NOT NULL AND RTRIM(LTRIM([Item No_])) <> ''",
                NavSelectQuery = @"
                    SELECT 
                        RTRIM(LTRIM([Item No_])) AS [ItemNo],
                        RTRIM(LTRIM([Code])) AS [UOMCode],
                        CAST(ISNULL([Qty_ per Unit of Measure], 1) AS decimal(18, 4)) AS [QtyPerUOM]
                    FROM [dbo].[House Care Live$Item Unit of Measure]
                    WHERE [Item No_] IS NOT NULL AND RTRIM(LTRIM([Item No_])) <> ''",
                Columns = new List<string> { "ItemNo", "UOMCode", "QtyPerUOM" }
            },
            ["barcodes"] = new TableSyncDefinition
            {
                TableKey = "barcodes",
                LocalTableName = "Altx Inv ItemBarcodes",
                DisplayName = "Altx Inv ItemBarcodes",
                NavTableName = "Barcodes",
                NavCountQuery = "SELECT COUNT(1) FROM [dbo].[House Care Live$Barcodes] WHERE [Barcode No_] IS NOT NULL AND RTRIM(LTRIM([Barcode No_])) <> ''",
                NavSelectQuery = @"
                    SELECT 
                        RTRIM(LTRIM([Barcode No_])) AS [BarcodeNo],
                        RTRIM(LTRIM([Item No_])) AS [ItemNo],
                        ISNULL(RTRIM(LTRIM([Unit of Measure Code])), '') AS [UOMCode]
                    FROM [dbo].[House Care Live$Barcodes]
                    WHERE [Barcode No_] IS NOT NULL AND RTRIM(LTRIM([Barcode No_])) <> ''",
                Columns = new List<string> { "BarcodeNo", "ItemNo", "UOMCode" }
            }
        };

        // GET: api/InventorySync/status
        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            var results = new List<object>();
            var localConnStr = _configuration.GetConnectionString("DefaultConnection");

            foreach (var kvp in Definitions)
            {
                var def = kvp.Value;
                int currentLocalCount = 0;
                DateTime? lastSync = null;
                string status = "Ready";

                try
                {
                    // Query local row count dynamically
                    using (var conn = new SqlConnection(localConnStr))
                    {
                        await conn.OpenAsync();
                        using var cmd = conn.CreateCommand();
                        cmd.CommandText = $"SELECT COUNT(1) FROM [{def.LocalTableName}]";
                        var countObj = await cmd.ExecuteScalarAsync();
                        if (countObj != null && countObj != DBNull.Value)
                        {
                            currentLocalCount = Convert.ToInt32(countObj);
                        }
                    }

                    // Query stored last sync status
                    var statusRecord = await _context.InventorySyncStatuses.FirstOrDefaultAsync(s => s.TableName == def.LocalTableName);
                    if (statusRecord != null)
                    {
                        lastSync = statusRecord.LastSyncDate;
                        status = statusRecord.Status;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[InventorySync] Error reading status for {def.LocalTableName}: {ex.Message}");
                }

                results.Add(new
                {
                    tableKey = def.TableKey,
                    tableName = def.LocalTableName,
                    displayName = def.DisplayName,
                    navSourceTable = def.NavTableName,
                    recordCount = currentLocalCount,
                    lastSyncDate = lastSync,
                    status = status
                });
            }

            // Step 1: Query StockCountEntries status & record count
            int stockCountTotal = 0;
            DateTime? stockCountLastFlush = null;
            string stockCountStatus = "Clean";
            try
            {
                using (var conn = new SqlConnection(localConnStr))
                {
                    await conn.OpenAsync();
                    using var cmd = conn.CreateCommand();
                    cmd.CommandText = "SELECT COUNT(1) FROM [StockCountEntries]";
                    var countObj = await cmd.ExecuteScalarAsync();
                    if (countObj != null && countObj != DBNull.Value)
                    {
                        stockCountTotal = Convert.ToInt32(countObj);
                    }
                }

                var stockStatusRec = await _context.InventorySyncStatuses.FirstOrDefaultAsync(s => s.TableName == "StockCountEntries");
                if (stockStatusRec != null)
                {
                    stockCountLastFlush = stockStatusRec.LastSyncDate;
                    stockCountStatus = stockStatusRec.Status;
                }
                else
                {
                    stockCountStatus = stockCountTotal == 0 ? "Clean" : "Active";
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[InventorySync] Error reading StockCountEntries status: {ex.Message}");
            }

            results.Add(new
            {
                tableKey = "stockcount",
                tableName = "StockCountEntries",
                displayName = "Stock Count Entries",
                navSourceTable = "Local Physical Count Store",
                recordCount = stockCountTotal,
                lastSyncDate = stockCountLastFlush,
                status = stockCountStatus
            });

            return Ok(results);
        }

        // POST: api/InventorySync/flush-stock-count
        [HttpPost("flush-stock-count")]
        public async Task<IActionResult> FlushStockCount()
        {
            try
            {
                var localConnStr = _configuration.GetConnectionString("DefaultConnection");
                int previousCount = 0;

                using (var conn = new SqlConnection(localConnStr))
                {
                    await conn.OpenAsync();

                    // Read previous count
                    using (var countCmd = conn.CreateCommand())
                    {
                        countCmd.CommandText = "SELECT COUNT(1) FROM [StockCountEntries]";
                        var res = await countCmd.ExecuteScalarAsync();
                        if (res != null && res != DBNull.Value)
                        {
                            previousCount = Convert.ToInt32(res);
                        }
                    }

                    // Flush all entries
                    using var flushCmd = conn.CreateCommand();
                    try
                    {
                        flushCmd.CommandText = "TRUNCATE TABLE [StockCountEntries]";
                        await flushCmd.ExecuteNonQueryAsync();
                    }
                    catch
                    {
                        flushCmd.CommandText = "DELETE FROM [StockCountEntries]";
                        await flushCmd.ExecuteNonQueryAsync();
                    }
                }

                // Update sync status log
                await UpdateSyncLog("StockCountEntries", 0, "Clean");

                return Ok(new
                {
                    success = true,
                    flushedCount = previousCount,
                    message = $"Successfully flushed all {previousCount:N0} records from Stock Count Entries table."
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[InventorySync] FlushStockCount error: {ex.Message}");
                return StatusCode(500, new { success = false, message = "Failed to flush stock count entries: " + ex.Message });
            }
        }

        // GET: api/InventorySync/sync-stream?table=items
        [HttpGet("sync-stream")]
        public async Task SyncStream([FromQuery] string table, CancellationToken cancellationToken)
        {
            Response.ContentType = "text/event-stream";
            Response.Headers["Cache-Control"] = "no-cache";
            Response.Headers["X-Accel-Buffering"] = "no";

            if (string.IsNullOrWhiteSpace(table) || !Definitions.TryGetValue(table, out var def))
            {
                await SendSseEvent(new { error = $"Invalid table key '{table}'. Allowed: items, itemuom, barcodes.", failed = true });
                return;
            }

            var localConnStr = _configuration.GetConnectionString("DefaultConnection");
            var navConnStr = _configuration.GetConnectionString("NavisionConnection");

            if (string.IsNullOrWhiteSpace(navConnStr))
            {
                await SendSseEvent(new { error = "Navision connection string is not configured.", failed = true });
                return;
            }

            try
            {
                await SendSseEvent(new { progress = 5, message = $"Connecting to Navision database...", tableKey = def.TableKey });

                int totalNavRecords = 0;
                using (var navConn = new SqlConnection(navConnStr))
                {
                    await navConn.OpenAsync(cancellationToken);
                    using var countCmd = navConn.CreateCommand();
                    countCmd.CommandText = def.NavCountQuery;
                    var obj = await countCmd.ExecuteScalarAsync(cancellationToken);
                    if (obj != null && obj != DBNull.Value)
                    {
                        totalNavRecords = Convert.ToInt32(obj);
                    }
                }

                await SendSseEvent(new { 
                    progress = 10, 
                    message = $"Found {totalNavRecords:N0} records in Navision. Flushing local table [{def.LocalTableName}]...",
                    total = totalNavRecords,
                    tableKey = def.TableKey
                });

                // Flush local table content
                using (var localConn = new SqlConnection(localConnStr))
                {
                    await localConn.OpenAsync(cancellationToken);
                    using var flushCmd = localConn.CreateCommand();
                    try
                    {
                        flushCmd.CommandText = $"TRUNCATE TABLE [{def.LocalTableName}]";
                        await flushCmd.ExecuteNonQueryAsync(cancellationToken);
                    }
                    catch
                    {
                        flushCmd.CommandText = $"DELETE FROM [{def.LocalTableName}]";
                        await flushCmd.ExecuteNonQueryAsync(cancellationToken);
                    }
                }

                await SendSseEvent(new { 
                    progress = 15, 
                    message = $"Local table flushed. Fetching and copying records...",
                    total = totalNavRecords,
                    tableKey = def.TableKey
                });

                if (totalNavRecords == 0)
                {
                    await UpdateSyncLog(def.LocalTableName, 0, "Success");
                    await SendSseEvent(new { 
                        progress = 100, 
                        completed = true, 
                        recordsSynced = 0, 
                        lastSyncDate = DateTime.Now,
                        message = "Sync complete. 0 records found in source table.",
                        tableKey = def.TableKey
                    });
                    return;
                }

                // Batch read from Nav and bulk insert into local table
                int totalCopied = 0;
                const int batchSize = 5000;

                using (var navConn = new SqlConnection(navConnStr))
                {
                    await navConn.OpenAsync(cancellationToken);
                    using var readCmd = navConn.CreateCommand();
                    readCmd.CommandText = def.NavSelectQuery;
                    readCmd.CommandTimeout = 300;

                    using var reader = await readCmd.ExecuteReaderAsync(cancellationToken);
                    
                    var tableData = CreateDataTable(def);

                    while (await reader.ReadAsync(cancellationToken))
                    {
                        var row = tableData.NewRow();
                        for (int i = 0; i < def.Columns.Count; i++)
                        {
                            var colName = def.Columns[i];
                            var val = reader[colName];
                            row[colName] = (val == null || val == DBNull.Value) ? DBNull.Value : val;
                        }
                        tableData.Rows.Add(row);

                        if (tableData.Rows.Count >= batchSize)
                        {
                            await BulkInsertBatch(localConnStr, def, tableData, cancellationToken);
                            totalCopied += tableData.Rows.Count;
                            tableData.Clear();

                            var pct = 15 + (int)(((double)totalCopied / totalNavRecords) * 80);
                            if (pct > 95) pct = 95;

                            await SendSseEvent(new { 
                                progress = pct, 
                                copied = totalCopied, 
                                total = totalNavRecords,
                                message = $"Syncing {totalCopied:N0} of {totalNavRecords:N0} records ({pct}%)...",
                                tableKey = def.TableKey
                            });
                        }
                    }

                    // Flush any remaining records in tableData
                    if (tableData.Rows.Count > 0)
                    {
                        await BulkInsertBatch(localConnStr, def, tableData, cancellationToken);
                        totalCopied += tableData.Rows.Count;
                        tableData.Clear();
                    }
                }

                // Persist sync log
                await UpdateSyncLog(def.LocalTableName, totalCopied, "Success");

                await SendSseEvent(new { 
                    progress = 100, 
                    completed = true, 
                    recordsSynced = totalCopied, 
                    lastSyncDate = DateTime.Now,
                    message = $"Successfully synchronized {totalCopied:N0} records into [{def.LocalTableName}]!",
                    tableKey = def.TableKey
                });
            }
            catch (OperationCanceledException)
            {
                Console.WriteLine($"[InventorySync] Sync for {def.LocalTableName} was canceled.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[InventorySync] Sync failed for {def.LocalTableName}: {ex.Message}");
                await UpdateSyncLog(def.LocalTableName, 0, "Failed");
                await SendSseEvent(new { error = $"Sync failed: {ex.Message}", failed = true, tableKey = def.TableKey });
            }
        }

        private static DataTable CreateDataTable(TableSyncDefinition def)
        {
            var dt = new DataTable();
            foreach (var col in def.Columns)
            {
                if (col.Equals("QtyPerUOM", StringComparison.OrdinalIgnoreCase))
                {
                    dt.Columns.Add(col, typeof(decimal));
                }
                else
                {
                    dt.Columns.Add(col, typeof(string));
                }
            }
            return dt;
        }

        private static async Task BulkInsertBatch(string localConnStr, TableSyncDefinition def, DataTable dt, CancellationToken ct)
        {
            using var conn = new SqlConnection(localConnStr);
            await conn.OpenAsync(ct);

            using var bulkCopy = new SqlBulkCopy(conn)
            {
                DestinationTableName = $"[{def.LocalTableName}]",
                BulkCopyTimeout = 180,
                BatchSize = dt.Rows.Count
            };

            foreach (var col in def.Columns)
            {
                bulkCopy.ColumnMappings.Add(col, col);
            }

            await bulkCopy.WriteToServerAsync(dt, ct);
        }

        private async Task UpdateSyncLog(string tableName, int count, string status)
        {
            try
            {
                var record = await _context.InventorySyncStatuses.FirstOrDefaultAsync(s => s.TableName == tableName);
                if (record == null)
                {
                    record = new InventorySyncStatus
                    {
                        TableName = tableName,
                        DisplayName = tableName,
                        NavSourceTable = tableName,
                        LastSyncDate = DateTime.Now,
                        RecordCount = count,
                        Status = status
                    };
                    _context.InventorySyncStatuses.Add(record);
                }
                else
                {
                    record.LastSyncDate = DateTime.Now;
                    record.RecordCount = count;
                    record.Status = status;
                }
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[InventorySync] UpdateSyncLog error: {ex.Message}");
            }
        }

        private async Task SendSseEvent(object data)
        {
            var json = JsonSerializer.Serialize(data);
            await Response.WriteAsync($"data: {json}\n\n");
            await Response.Body.FlushAsync();
        }
    }
}
