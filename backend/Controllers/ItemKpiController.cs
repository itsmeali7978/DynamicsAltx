using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Backend.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ItemKpiController : ControllerBase
    {
        private readonly AppDbContext _db;

        public ItemKpiController(AppDbContext db)
        {
            _db = db;
        }

        public class ItemKpiItemDto
        {
            public string Date { get; set; } = string.Empty; // YYYY-MM-DD
            public int ItemNo { get; set; }
            public string? DescAra { get; set; }
            public string? DescEng { get; set; }
            public decimal SalesQty { get; set; }
            public decimal NetSales { get; set; }
            public decimal ProducedQty { get; set; }
            public decimal ExpiredQty { get; set; }
            public decimal WastePercent { get; set; }
            public decimal SellThroughPercent { get; set; }
            public decimal ProductionBalance { get; set; }
        }

        public class ItemKpiResponseDto
        {
            public string FromDate { get; set; } = string.Empty;
            public string ToDate { get; set; } = string.Empty;
            public decimal TotalSalesQty { get; set; }
            public decimal TotalNetSales { get; set; }
            public decimal TotalProducedQty { get; set; }
            public decimal TotalExpiredQty { get; set; }
            public decimal AverageWastePercent { get; set; }
            public decimal AverageSellThroughPercent { get; set; }
            public decimal TotalProductionBalance { get; set; }
            public List<ItemKpiItemDto> Items { get; set; } = new List<ItemKpiItemDto>();
        }

        // GET: api/ItemKpi?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD&itemNo=123
        [HttpGet]
        public async Task<IActionResult> GetItemKpi([FromQuery] string? fromDate, [FromQuery] string? toDate, [FromQuery] string? itemNo)
        {
            DateTime now = DateTime.Today;
            DateTime startDate;
            DateTime endDate;

            if (!string.IsNullOrWhiteSpace(fromDate) && DateTime.TryParse(fromDate, out DateTime parsedFrom))
            {
                startDate = parsedFrom.Date;
            }
            else
            {
                // Default: 1st of current month
                startDate = new DateTime(now.Year, now.Month, 1);
            }

            if (!string.IsNullOrWhiteSpace(toDate) && DateTime.TryParse(toDate, out DateTime parsedTo))
            {
                endDate = parsedTo.Date;
            }
            else
            {
                // Default: last day of current month
                endDate = new DateTime(now.Year, now.Month, DateTime.DaysInMonth(now.Year, now.Month));
            }

            if (startDate > endDate)
            {
                var temp = startDate;
                startDate = endDate;
                endDate = temp;
            }

            int? specificItemNo = null;
            if (!string.IsNullOrWhiteSpace(itemNo) && int.TryParse(itemNo.Trim(), out int parsedItemNo))
            {
                specificItemNo = parsedItemNo;
            }

            // Step 1: Fetch items from AltxItems table
            var altxItemsQuery = _db.AltxItems.AsNoTracking();
            if (specificItemNo.HasValue)
            {
                altxItemsQuery = altxItemsQuery.Where(x => x.ItemNo == specificItemNo.Value);
            }
            var altxItems = await altxItemsQuery.OrderBy(x => x.ItemNo).ToListAsync();
            var altxItemsMap = altxItems.ToDictionary(x => x.ItemNo);

            // Step 2: Fetch sales data grouped by (Date, ItemNo)
            var salesQuery = _db.FetchedSalesData
                .AsNoTracking()
                .Where(x => x.SalesDate.Date >= startDate && x.SalesDate.Date <= endDate);

            if (specificItemNo.HasValue)
            {
                salesQuery = salesQuery.Where(x => x.ItemNo == specificItemNo.Value);
            }

            var salesList = await salesQuery
                .GroupBy(x => new { Date = x.SalesDate.Date, x.ItemNo })
                .Select(g => new
                {
                    g.Key.Date,
                    g.Key.ItemNo,
                    SalesQty = g.Sum(x => x.Qty),
                    NetSales = g.Sum(x => x.NetAmount)
                })
                .ToListAsync();

            var salesMap = salesList.ToDictionary(x => (x.Date, x.ItemNo));

            // Step 3: Fetch daily activities grouped by (Date, ItemNo)
            var actQuery = _db.DailyActivities
                .AsNoTracking()
                .Where(x => x.ActivityDate.Date >= startDate && x.ActivityDate.Date <= endDate);

            if (specificItemNo.HasValue)
            {
                actQuery = actQuery.Where(x => x.ItemNo == specificItemNo.Value);
            }

            var actList = await actQuery
                .GroupBy(x => new { Date = x.ActivityDate.Date, x.ItemNo })
                .Select(g => new
                {
                    g.Key.Date,
                    g.Key.ItemNo,
                    ProducedQty = g.Sum(x => x.ProducedQty),
                    ExpiredQty = g.Sum(x => x.ExpiredQty)
                })
                .ToListAsync();

            var actMap = actList.ToDictionary(x => (x.Date, x.ItemNo));

            // Step 4: Build keys against AltxItems table for every date in [startDate .. endDate]
            var allKeys = new List<(DateTime Date, int ItemNo)>();

            if (altxItems.Any())
            {
                for (DateTime dt = startDate; dt <= endDate; dt = dt.AddDays(1))
                {
                    foreach (var item in altxItems)
                    {
                        allKeys.Add((dt, item.ItemNo));
                    }
                }
            }
            else
            {
                var keySet = new HashSet<(DateTime Date, int ItemNo)>(salesMap.Keys);
                foreach (var k in actMap.Keys) keySet.Add(k);
                allKeys = keySet.OrderByDescending(k => k.Date).ThenBy(k => k.ItemNo).ToList();
            }

            // Step 5: Build result items
            var items = new List<ItemKpiItemDto>();
            decimal totalSalesQty = 0m;
            decimal totalNetSales = 0m;
            decimal totalProducedQty = 0m;
            decimal totalExpiredQty = 0m;

            foreach (var key in allKeys.OrderByDescending(k => k.Date).ThenBy(k => k.ItemNo))
            {
                decimal salesQty = salesMap.TryGetValue(key, out var s) ? s.SalesQty : 0m;
                decimal netSales = salesMap.TryGetValue(key, out var s2) ? s2.NetSales : 0m;
                decimal producedQty = actMap.TryGetValue(key, out var a) ? a.ProducedQty : 0m;
                decimal expiredQty = actMap.TryGetValue(key, out var a2) ? a2.ExpiredQty : 0m;

                decimal wastePercent = 0m;
                if (producedQty != 0)
                {
                    wastePercent = Math.Round((expiredQty / producedQty) * 100m, 2);
                }

                decimal sellThroughPercent = 0m;
                decimal salesPlusExpired = salesQty + expiredQty;
                if (salesPlusExpired != 0)
                {
                    sellThroughPercent = Math.Round((salesQty / salesPlusExpired) * 100m, 2);
                }

                decimal productionBalance = producedQty - salesQty - expiredQty;

                altxItemsMap.TryGetValue(key.ItemNo, out var altxItem);

                items.Add(new ItemKpiItemDto
                {
                    Date = key.Date.ToString("yyyy-MM-dd"),
                    ItemNo = key.ItemNo,
                    DescAra = altxItem?.DescAra ?? "-",
                    DescEng = altxItem?.DescEng ?? "-",
                    SalesQty = salesQty,
                    NetSales = netSales,
                    ProducedQty = producedQty,
                    ExpiredQty = expiredQty,
                    WastePercent = wastePercent,
                    SellThroughPercent = sellThroughPercent,
                    ProductionBalance = productionBalance
                });

                totalSalesQty += salesQty;
                totalNetSales += netSales;
                totalProducedQty += producedQty;
                totalExpiredQty += expiredQty;
            }

            decimal overallWastePercent = 0m;
            if (totalProducedQty != 0)
            {
                overallWastePercent = Math.Round((totalExpiredQty / totalProducedQty) * 100m, 2);
            }

            decimal overallSellThroughPercent = 0m;
            decimal totalSalesPlusExpired = totalSalesQty + totalExpiredQty;
            if (totalSalesPlusExpired != 0)
            {
                overallSellThroughPercent = Math.Round((totalSalesQty / totalSalesPlusExpired) * 100m, 2);
            }

            decimal totalProductionBalance = totalProducedQty - totalSalesQty - totalExpiredQty;

            var response = new ItemKpiResponseDto
            {
                FromDate = startDate.ToString("yyyy-MM-dd"),
                ToDate = endDate.ToString("yyyy-MM-dd"),
                TotalSalesQty = totalSalesQty,
                TotalNetSales = totalNetSales,
                TotalProducedQty = totalProducedQty,
                TotalExpiredQty = totalExpiredQty,
                AverageWastePercent = overallWastePercent,
                AverageSellThroughPercent = overallSellThroughPercent,
                TotalProductionBalance = totalProductionBalance,
                Items = items
            };

            return Ok(response);
        }
    }
}
