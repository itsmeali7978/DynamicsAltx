using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FetchSalesDataController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;

        public FetchSalesDataController(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        public class FetchRequestDto
        {
            public string Date { get; set; } = string.Empty;
            public string? ItemNo { get; set; }
            public string? FetchedBy { get; set; }
        }

        // POST: api/FetchSalesData/fetch
        [HttpPost("fetch")]
        public async Task<IActionResult> FetchSalesData([FromBody] FetchRequestDto req)
        {
            if (string.IsNullOrWhiteSpace(req.Date) || !DateTime.TryParse(req.Date, out DateTime targetDate))
            {
                return BadRequest(new { message = "Invalid date specified." });
            }

            int specificItemNo = 0;
            bool hasSpecificItem = !string.IsNullOrWhiteSpace(req.ItemNo) && int.TryParse(req.ItemNo.Trim(), out specificItemNo);

            // Step 1: Fetch items present in local AltxItems table
            var altxItemsQuery = _db.AltxItems.AsNoTracking();
            if (hasSpecificItem)
            {
                altxItemsQuery = altxItemsQuery.Where(x => x.ItemNo == specificItemNo);
            }

            var altxItemsMap = await altxItemsQuery.ToDictionaryAsync(x => x.ItemNo);

            if (!altxItemsMap.Any())
            {
                return BadRequest(new { message = hasSpecificItem ? $"Item No {req.ItemNo} not found in local AltxItems table. Please sync items first." : "No items found in local AltxItems table. Please sync items first." });
            }

            // Step 2: Delete existing local sales data for the selected date and item (overwrite rule)
            var existingQuery = _db.FetchedSalesData.Where(x => x.SalesDate.Date == targetDate);
            if (hasSpecificItem)
            {
                existingQuery = existingQuery.Where(x => x.ItemNo == specificItemNo);
            }

            var existingForDate = await existingQuery.ToListAsync();

            if (existingForDate.Any())
            {
                _db.FetchedSalesData.RemoveRange(existingForDate);
                await _db.SaveChangesAsync();
            }

            // Step 3: Query Navision table Trans. Sales Entry for Store No_ = 'S0001', targetDate, and optional ItemNo
            var navConnStr = _config.GetConnectionString("NavisionConnection");
            if (string.IsNullOrWhiteSpace(navConnStr))
            {
                return StatusCode(500, new { message = "Navision database connection string is missing." });
            }

            var newSalesList = new List<FetchedSalesData>();

            try
            {
                using var conn = new SqlConnection(navConnStr);
                await conn.OpenAsync();

                var sql = @"
                    SELECT 
                        [Item No_] AS NavItemNo,
                        SUM([Quantity]) AS TotalQty,
                        SUM([Net Amount]) AS TotalNetAmount,
                        AVG([Price]) AS AvgPrice
                    FROM [dbo].[House Care Live$Trans_ Sales Entry]
                    WHERE [Store No_] = 'S0001'
                      AND CAST([Date] AS DATE) = @TargetDate";

                if (hasSpecificItem)
                {
                    sql += " AND [Item No_] = @SpecificItemNo";
                }

                sql += " GROUP BY [Item No_]";

                using var cmd = new SqlCommand(sql, conn);
                cmd.Parameters.Add("@TargetDate", SqlDbType.Date).Value = targetDate;
                if (hasSpecificItem)
                {
                    cmd.Parameters.AddWithValue("@SpecificItemNo", specificItemNo.ToString());
                }

                using var reader = await cmd.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    var rawItemNoStr = reader["NavItemNo"]?.ToString()?.Trim();
                    if (int.TryParse(rawItemNoStr, out int itemNo))
                    {
                        if (altxItemsMap.TryGetValue(itemNo, out var altxItem))
                        {
                            decimal qty = reader["TotalQty"] != DBNull.Value ? Convert.ToDecimal(reader["TotalQty"]) : 0m;
                            decimal netAmt = reader["TotalNetAmount"] != DBNull.Value ? Convert.ToDecimal(reader["TotalNetAmount"]) : 0m;
                            decimal avgPrice = reader["AvgPrice"] != DBNull.Value ? Convert.ToDecimal(reader["AvgPrice"]) : 0m;

                            decimal unitPrice = avgPrice;
                            if (qty != 0)
                            {
                                unitPrice = Math.Round(Math.Abs(netAmt / qty), 2);
                            }

                            newSalesList.Add(new FetchedSalesData
                            {
                                SalesDate = targetDate,
                                ItemNo = itemNo,
                                DescEng = altxItem.DescEng,
                                DescAra = altxItem.DescAra,
                                Qty = qty,
                                Price = unitPrice,
                                NetAmount = netAmt,
                                FetchedBy = req.FetchedBy ?? "Admin User",
                                FetchedAt = DateTime.UtcNow
                            });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error querying Navision sales entry table: {ex.Message}" });
            }

            if (newSalesList.Any())
            {
                await _db.FetchedSalesData.AddRangeAsync(newSalesList);
                await _db.SaveChangesAsync();
            }

            string itemFilterText = hasSpecificItem ? $" for Item No {specificItemNo}" : "";
            return Ok(new
            {
                message = $"Successfully fetched and merged {newSalesList.Count} sales records for {targetDate:yyyy-MM-dd}{itemFilterText}.",
                count = newSalesList.Count,
                records = newSalesList
            });
        }

        // GET: api/FetchSalesData?date=YYYY-MM-DD&itemNo=120227
        [HttpGet]
        public async Task<IActionResult> GetSalesData([FromQuery] string? date, [FromQuery] string? itemNo)
        {
            var query = _db.FetchedSalesData.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(date) && DateTime.TryParse(date, out DateTime parsedDate))
            {
                var d = parsedDate.Date;
                query = query.Where(x => x.SalesDate.Date == d);
            }

            if (!string.IsNullOrWhiteSpace(itemNo) && int.TryParse(itemNo.Trim(), out int parsedItemNo))
            {
                query = query.Where(x => x.ItemNo == parsedItemNo);
            }

            var records = await query
                .OrderByDescending(x => x.SalesDate)
                .ThenBy(x => x.ItemNo)
                .ToListAsync();

            return Ok(records);
        }
    }
}
