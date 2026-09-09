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
            public string? Date { get; set; }
            public string? FromDate { get; set; }
            public string? ToDate { get; set; }
            public string? ItemNo { get; set; }
            public string? FetchedBy { get; set; }
        }

        // POST: api/FetchSalesData/fetch
        [HttpPost("fetch")]
        public async Task<IActionResult> FetchSalesData([FromBody] FetchRequestDto req)
        {
            DateTime startDate;
            DateTime endDate;

            if (!string.IsNullOrWhiteSpace(req.FromDate) && DateTime.TryParse(req.FromDate, out startDate) &&
                !string.IsNullOrWhiteSpace(req.ToDate) && DateTime.TryParse(req.ToDate, out endDate))
            {
                // Range specified
            }
            else if (!string.IsNullOrWhiteSpace(req.Date) && DateTime.TryParse(req.Date, out startDate))
            {
                endDate = startDate;
            }
            else
            {
                return BadRequest(new { message = "Invalid date specified." });
            }

            startDate = startDate.Date;
            endDate = endDate.Date;

            if (endDate < startDate)
            {
                return BadRequest(new { message = "To Date cannot be earlier than From Date." });
            }

            // Restrict fetching period to maximum 4 days
            if ((endDate - startDate).TotalDays > 3)
            {
                return BadRequest(new { message = "Date period cannot exceed 4 days. Please select a range of 4 days or less." });
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

            // Step 2: Delete existing local sales data for the selected date range and optional item
            var existingQuery = _db.FetchedSalesData.Where(x => x.SalesDate.Date >= startDate && x.SalesDate.Date <= endDate);
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

            // Step 3: Query Navision table Trans. Sales Entry for Store No_ = 'S0001', date range, and optional ItemNo
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
                        CAST([Date] AS DATE) AS NavDate,
                        [Item No_] AS NavItemNo,
                        SUM([Quantity]) AS TotalQty,
                        SUM([Net Amount]) AS TotalNetAmount,
                        AVG([Price]) AS AvgPrice
                    FROM [dbo].[House Care Live$Trans_ Sales Entry]
                    WHERE [Store No_] = 'S0001'
                      AND CAST([Date] AS DATE) >= @FromDate
                      AND CAST([Date] AS DATE) <= @ToDate";

                if (hasSpecificItem)
                {
                    sql += " AND [Item No_] = @SpecificItemNo";
                }

                sql += " GROUP BY CAST([Date] AS DATE), [Item No_]";

                using var cmd = new SqlCommand(sql, conn);
                cmd.Parameters.Add("@FromDate", SqlDbType.Date).Value = startDate;
                cmd.Parameters.Add("@ToDate", SqlDbType.Date).Value = endDate;
                if (hasSpecificItem)
                {
                    cmd.Parameters.AddWithValue("@SpecificItemNo", specificItemNo.ToString());
                }

                using var reader = await cmd.ExecuteReaderAsync();

                while (await reader.ReadAsync())
                {
                    var navDate = Convert.ToDateTime(reader["NavDate"]);
                    var rawItemNoStr = reader["NavItemNo"]?.ToString()?.Trim();
                    if (int.TryParse(rawItemNoStr, out int itemNo))
                    {
                        if (altxItemsMap.TryGetValue(itemNo, out var altxItem))
                        {
                            decimal rawQty = reader["TotalQty"] != DBNull.Value ? Convert.ToDecimal(reader["TotalQty"]) : 0m;
                            decimal rawNetAmt = reader["TotalNetAmount"] != DBNull.Value ? Convert.ToDecimal(reader["TotalNetAmount"]) : 0m;
                            decimal avgPrice = reader["AvgPrice"] != DBNull.Value ? Convert.ToDecimal(reader["AvgPrice"]) : 0m;

                            // Invert signs as required: -(-qty) = qty, -(qty) = -qty
                            decimal qty = -rawQty;
                            decimal netAmt = -rawNetAmt;

                            decimal unitPrice = avgPrice;
                            if (rawQty != 0)
                            {
                                unitPrice = Math.Round(Math.Abs(rawNetAmt / rawQty), 2);
                            }

                            newSalesList.Add(new FetchedSalesData
                            {
                                SalesDate = navDate,
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
            string dateRangeStr = startDate == endDate ? $"{startDate:yyyy-MM-dd}" : $"{startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}";
            return Ok(new
            {
                message = $"Successfully fetched and merged {newSalesList.Count} sales records for {dateRangeStr}{itemFilterText}.",
                count = newSalesList.Count,
                records = newSalesList
            });
        }

        // GET: api/FetchSalesData?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&itemNo=120227
        [HttpGet]
        public async Task<IActionResult> GetSalesData([FromQuery] string? fromDate, [FromQuery] string? toDate, [FromQuery] string? date, [FromQuery] string? itemNo)
        {
            var query = _db.FetchedSalesData.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(fromDate) && DateTime.TryParse(fromDate, out DateTime parsedFrom) &&
                !string.IsNullOrWhiteSpace(toDate) && DateTime.TryParse(toDate, out DateTime parsedTo))
            {
                var f = parsedFrom.Date;
                var t = parsedTo.Date;
                query = query.Where(x => x.SalesDate.Date >= f && x.SalesDate.Date <= t);
            }
            else if (!string.IsNullOrWhiteSpace(date) && DateTime.TryParse(date, out DateTime parsedDate))
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
