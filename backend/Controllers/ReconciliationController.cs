using Backend.Data;
using Backend.Helpers;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using System;
using System.Linq;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ReconciliationController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ReconciliationController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Reconciliation/locations
        [HttpGet("locations")]
        public async Task<ActionResult<IEnumerable<string>>> GetActiveLocations()
        {
            var locations = await _context.Locations
                .Where(l => l.Status.ToLower() == "active")
                .Select(l => l.LocationCode)
                .ToListAsync();

            if (locations.Count == 0)
            {
                // If no active locations found, let's see why. 
                // We'll return a special value or just log it.
                // For now, let's just ensure case insensitivity.
            }

            return locations;
        }

        // GET: api/Reconciliation/customers
        [HttpGet("customers")]
        public async Task<ActionResult> GetCustomers()
        {
            try
            {
                // 1. Fetch 'HO' location details
                var hoLocation = await _context.Locations.FirstOrDefaultAsync(l => l.LocationCode == "HO");
                if (hoLocation == null)
                {
                    return NotFound(new { message = "Head Office (HO) location not found in the configuration." });
                }

                // 2. Build connection string
                string plainPassword = string.IsNullOrEmpty(hoLocation.Password)
                    ? "" : EncryptionHelper.Decrypt(hoLocation.Password);

                var connStr = $"Server={hoLocation.IPAddress};Database={hoLocation.DbName};" +
                              $"User Id={hoLocation.Username};Password={plainPassword};" +
                              $"TrustServerCertificate=True;Connect Timeout=15;";

                var customers = new List<object>();

                // 3. Query Customers from HO database
                using (var conn = new SqlConnection(connStr))
                {
                    await conn.OpenAsync();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT [No_], [Name] FROM [dbo].[House Care Live$Customer] ORDER BY [No_] ASC";
                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                customers.Add(new
                                {
                                    No = reader.IsDBNull(0) ? "" : reader.GetString(0),
                                    Name = reader.IsDBNull(1) ? "" : reader.GetString(1)
                                });
                            }
                        }
                    }
                }

                return Ok(customers);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error fetching customers: {ex.Message}" });
            }
        }
        // POST: api/Reconciliation/fetch-invoices
        [HttpPost("fetch-invoices")]
        public async Task<ActionResult> FetchInvoices([FromBody] FetchInvoicesRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.SenderLocation) || string.IsNullOrEmpty(request.FromDate) || string.IsNullOrEmpty(request.ToDate))
            {
                return BadRequest(new { message = "Sender Location, From Date, and To Date are mandatory fields." });
            }

            try
            {
                // 1. Fetch Location details
                var location = await _context.Locations.FirstOrDefaultAsync(l => l.LocationCode == request.SenderLocation);
                if (location == null)
                {
                    return NotFound(new { message = $"Location '{request.SenderLocation}' not found." });
                }

                // 2. Build connection string
                string plainPassword = string.IsNullOrEmpty(location.Password)
                    ? "" : EncryptionHelper.Decrypt(location.Password);

                var connStr = $"Server={location.IPAddress};Database={location.DbName};" +
                              $"User Id={location.Username};Password={plainPassword};" +
                              $"TrustServerCertificate=True;Connect Timeout=15;";

                var result = new ReconciliationDataResponse();

                // Parse dates securely and extend toDate to the end of the day
                DateTime fromDate, toDate;
                if (!DateTime.TryParse(request.FromDate, out fromDate) || !DateTime.TryParse(request.ToDate, out toDate))
                {
                    return BadRequest(new { message = "Invalid date format." });
                }
                
                // Adjust toDate to include the entire day - using Date property to ensure no time leaks
                fromDate = fromDate.Date;
                toDate = toDate.Date;

                Console.WriteLine($"[Reconciliation API] Fetching Documents: {request.SenderLocation} | {fromDate:yyyy-MM-dd} to {toDate:yyyy-MM-dd} | Customer: {request.CustomerNo}");


                // 3. Query External Database
                using (var conn = new SqlConnection(connStr))
                {
                    await conn.OpenAsync();
                    
                    // Verify if Tables exist first to avoid generic errors
                    bool invoiceTableExists = await CheckTableExists(conn, "House Care Live$Sales Invoice Header");
                    bool creditMemoTableExists = await CheckTableExists(conn, "House Care Live$Sales Cr_Memo Header");

                    if (!invoiceTableExists && !creditMemoTableExists)
                    {
                        return BadRequest(new { message = $"Critical: Dynamics ERP tables not found in database '{location.DbName}'. Please check connection configuration." });
                    }

                    // Fetch Invoices
                    if (invoiceTableExists)
                    {
                        using (var cmd = conn.CreateCommand())
                        {
                            // Use CAST to DATE on both sides to ensure standard DATE comparison (IGNORING TIME)
                            string query = "SELECT [No_] FROM [dbo].[House Care Live$Sales Invoice Header] " +
                                           "WHERE CAST([Posting Date] AS DATE) BETWEEN @From AND @To";
                            
                            if (!string.IsNullOrEmpty(request.CustomerNo)) query += " AND TRIM([Sell-to Customer No_]) = @CustomerNo";
                            query += " ORDER BY [No_] ASC";
                            
                            cmd.CommandText = query;
                            cmd.Parameters.AddWithValue("@From", fromDate);
                            cmd.Parameters.AddWithValue("@To", toDate);
                            if (!string.IsNullOrEmpty(request.CustomerNo)) cmd.Parameters.AddWithValue("@CustomerNo", request.CustomerNo);

                            using (var reader = await cmd.ExecuteReaderAsync())
                            {
                                while (await reader.ReadAsync())
                                {
                                    result.Invoices.Add(reader.IsDBNull(0) ? "" : reader.GetString(0));
                                }
                            }
                        }
                    }

                    // Fetch Credit Memos (Sales Returns)
                    if (creditMemoTableExists)
                    {
                        using (var cmd = conn.CreateCommand())
                        {
                            string query = "SELECT [No_] FROM [dbo].[House Care Live$Sales Cr_Memo Header] " +
                                           "WHERE CAST([Posting Date] AS DATE) BETWEEN @From AND @To";
                            
                            if (!string.IsNullOrEmpty(request.CustomerNo)) query += " AND TRIM([Sell-to Customer No_]) = @CustomerNo";
                            query += " ORDER BY [No_] ASC";

                            cmd.CommandText = query;
                            cmd.Parameters.AddWithValue("@From", fromDate);
                            cmd.Parameters.AddWithValue("@To", toDate);
                            if (!string.IsNullOrEmpty(request.CustomerNo)) cmd.Parameters.AddWithValue("@CustomerNo", request.CustomerNo);

                            using (var reader = await cmd.ExecuteReaderAsync())
                            {
                                while (await reader.ReadAsync())
                                {
                                    result.CreditMemos.Add(reader.IsDBNull(0) ? "" : reader.GetString(0));
                                }
                            }
                        }
                    }
                }

                return Ok(result);
            }
            catch (SqlException ex)
            {
                return BadRequest(new { message = $"Database Connection Error: {ex.Message} (Check if '{request.SenderLocation}' is reachable)" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Processing Error: {ex.Message}" });
            }
        }

        private async Task<bool> CheckTableExists(SqlConnection conn, string tableName)
        {
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT COUNT(*) FROM sys.tables WHERE name = @TableName";
                cmd.Parameters.AddWithValue("@TableName", tableName);
                var count = (int)await cmd.ExecuteScalarAsync();
                return count > 0;
            }
        }
    }

    public class FetchInvoicesRequest
    {
        public string SenderLocation { get; set; }
        public string FromDate { get; set; }
        public string ToDate { get; set; }
        public string CustomerNo { get; set; }
    }

    public class ReconciliationDataResponse
    {
        public List<string> Invoices { get; set; } = new List<string>();
        public List<string> CreditMemos { get; set; } = new List<string>();
    }
}


