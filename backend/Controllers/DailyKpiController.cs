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
    public class DailyKpiController : ControllerBase
    {
        private readonly AppDbContext _db;

        public DailyKpiController(AppDbContext db)
        {
            _db = db;
        }

        public class DailyKpiItemDto
        {
            public string Date { get; set; } = string.Empty; // YYYY-MM-DD
            public decimal SalesQty { get; set; }
            public decimal NetSales { get; set; }
            public decimal ProducedQty { get; set; }
            public decimal ExpiredQty { get; set; }
            public decimal WastePercent { get; set; }
            public decimal SellThroughPercent { get; set; }
            public decimal ProductionBalance { get; set; }
        }

        public class DailyKpiResponseDto
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
            public List<DailyKpiItemDto> Items { get; set; } = new List<DailyKpiItemDto>();
        }

        // GET: api/DailyKpi?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
        [HttpGet]
        public async Task<IActionResult> GetDailyKpi([FromQuery] string? fromDate, [FromQuery] string? toDate)
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

            // Step 1: Fetch sales data grouped by date
            var salesGrouped = await _db.FetchedSalesData
                .AsNoTracking()
                .Where(x => x.SalesDate.Date >= startDate && x.SalesDate.Date <= endDate)
                .GroupBy(x => x.SalesDate.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    SalesQty = g.Sum(x => x.Qty),
                    NetSales = g.Sum(x => x.NetAmount)
                })
                .ToDictionaryAsync(x => x.Date);

            // Step 2: Fetch daily activities grouped by date
            var activitiesGrouped = await _db.DailyActivities
                .AsNoTracking()
                .Where(x => x.ActivityDate.Date >= startDate && x.ActivityDate.Date <= endDate)
                .GroupBy(x => x.ActivityDate.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    ProducedQty = g.Sum(x => x.ProducedQty),
                    ExpiredQty = g.Sum(x => x.ExpiredQty)
                })
                .ToDictionaryAsync(x => x.Date);

            // Step 3: Build grid rows for every date in range [startDate .. endDate]
            var items = new List<DailyKpiItemDto>();
            decimal totalSalesQty = 0m;
            decimal totalNetSales = 0m;
            decimal totalProducedQty = 0m;
            decimal totalExpiredQty = 0m;

            for (DateTime dt = startDate; dt <= endDate; dt = dt.AddDays(1))
            {
                decimal salesQty = salesGrouped.TryGetValue(dt, out var s) ? s.SalesQty : 0m;
                decimal netSales = salesGrouped.TryGetValue(dt, out var s2) ? s2.NetSales : 0m;
                decimal producedQty = activitiesGrouped.TryGetValue(dt, out var a) ? a.ProducedQty : 0m;
                decimal expiredQty = activitiesGrouped.TryGetValue(dt, out var a2) ? a2.ExpiredQty : 0m;

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

                items.Add(new DailyKpiItemDto
                {
                    Date = dt.ToString("yyyy-MM-dd"),
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

            var response = new DailyKpiResponseDto
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
