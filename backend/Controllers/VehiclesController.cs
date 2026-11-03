using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Data;
using Microsoft.Data.SqlClient;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VehiclesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<VehiclesController> _logger;
        private static readonly HttpClient _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
        private static readonly ConcurrentDictionary<string, string?> _imageCache = new ConcurrentDictionary<string, string?>(StringComparer.OrdinalIgnoreCase);

        // Curated high-quality vehicle images as instant fast fallback
        private static readonly Dictionary<string, string> _curatedImages = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["COROLLA"] = "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=400&auto=format&fit=crop&q=80",
            ["TOYOTA"] = "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400&auto=format&fit=crop&q=80",
            ["PICKUP"] = "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=400&auto=format&fit=crop&q=80",
            ["DYNA"] = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Toyota_Dyna_200_Series.jpg/320px-Toyota_Dyna_200_Series.jpg",
            ["HYUNDAI"] = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Hyundai_Porter_II_Double_Cab_fl_1_cropped.jpg/320px-Hyundai_Porter_II_Double_Cab_fl_1_cropped.jpg",
            ["ISUZU"] = "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Nippon_Rent-A-Car_Isuzu_Elf_NJR85A.jpg/320px-Nippon_Rent-A-Car_Isuzu_Elf_NJR85A.jpg",
            ["SUZUKI"] = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Suzuki_Carry_Truck_KC_4WD_DA16T.JPG/320px-Suzuki_Carry_Truck_KC_4WD_DA16T.JPG",
            ["MITSUBISHI"] = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Fuso_Canter_3C13%2C_8th_Generation.jpg/320px-Fuso_Canter_3C13%2C_8th_Generation.jpg",
            ["FUSO"] = "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Fuso_Canter_3C13%2C_8th_Generation.jpg/320px-Fuso_Canter_3C13%2C_8th_Generation.jpg",
            ["DAIHATSU"] = "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Daihatsu_Hijet_Cargo_1101.jpg/320px-Daihatsu_Hijet_Cargo_1101.jpg",
            ["FORKLIFT"] = "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&auto=format&fit=crop&q=80",
            ["REFRIGERATOR"] = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Hyundai_Porter_II_Double_Cab_fl_1_cropped.jpg/320px-Hyundai_Porter_II_Double_Cab_fl_1_cropped.jpg"
        };

        public VehiclesController(AppDbContext context, IConfiguration configuration, ILogger<VehiclesController> logger)
        {
            _context = context;
            _configuration = configuration;
            _logger = logger;
        }

        // GET: api/Vehicles
        [HttpGet]
        public async Task<IActionResult> GetVehicles([FromQuery] string? search = null, [FromQuery] string? status = null)
        {
            try
            {
                var navConnStr = _configuration.GetConnectionString("NavisionConnection");
                if (string.IsNullOrWhiteSpace(navConnStr))
                {
                    return StatusCode(500, new { success = false, message = "Navision connection string not configured." });
                }

                var navVehicles = new List<VehicleDto>();

                using (var conn = new SqlConnection(navConnStr))
                {
                    await conn.OpenAsync();
                    using var cmd = conn.CreateCommand();
                    cmd.CommandText = @"
                        SELECT [Code], [Name], [Blocked]
                        FROM [dbo].[House Care Live$Dimension Value]
                        WHERE [Dimension Code] = 'VEHICLE'
                        ORDER BY [Code]";

                    using var reader = await cmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        var code = reader.IsDBNull(0) ? "" : reader.GetString(0).Trim();
                        var name = reader.IsDBNull(1) ? "" : reader.GetString(1).Trim();
                        var blocked = reader.IsDBNull(2) ? (byte)0 : reader.GetByte(2);

                        if (!string.IsNullOrEmpty(code))
                        {
                            navVehicles.Add(new VehicleDto
                            {
                                Code = code,
                                Name = string.IsNullOrWhiteSpace(name) ? code : name,
                                Blocked = blocked
                            });
                        }
                    }
                }

                // Query local recorded expenses grouped by vehicle
                var expenses = await _context.VehicleExpenses
                    .GroupBy(e => e.VehicleCode)
                    .Select(g => new
                    {
                        VehicleCode = g.Key,
                        TotalExpense = g.Sum(x => x.Amount),
                        Count = g.Count()
                    })
                    .ToListAsync();

                var expenseMap = expenses.ToDictionary(x => x.VehicleCode, x => x.TotalExpense, StringComparer.OrdinalIgnoreCase);
                var countMap = expenses.ToDictionary(x => x.VehicleCode, x => x.Count, StringComparer.OrdinalIgnoreCase);

                // Apply search and status filters
                var filtered = navVehicles.AsEnumerable();

                if (!string.IsNullOrWhiteSpace(search))
                {
                    var s = search.Trim();
                    filtered = filtered.Where(v =>
                        v.Code.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                        v.Name.Contains(s, StringComparison.OrdinalIgnoreCase));
                }

                if (!string.IsNullOrWhiteSpace(status))
                {
                    if (status.Equals("active", StringComparison.OrdinalIgnoreCase))
                    {
                        filtered = filtered.Where(v => v.Blocked == 0);
                    }
                    else if (status.Equals("blocked", StringComparison.OrdinalIgnoreCase))
                    {
                        filtered = filtered.Where(v => v.Blocked == 1);
                    }
                }

                var resultList = filtered.Select(v =>
                {
                    return new
                    {
                        code = v.Code,
                        name = v.Name,
                        blocked = v.Blocked,
                        statusText = v.Blocked == 1 ? "Blocked" : "Active",
                        expenseAmount = 0m,
                        expenseAmountDisplay = "0.00 SAR",
                        imageUrl = ResolveVehicleImageUrl(v.Code, v.Name)
                    };
                }).ToList();

                return Ok(new
                {
                    success = true,
                    total = resultList.Count,
                    totalVehicles = navVehicles.Count,
                    activeVehicles = navVehicles.Count(v => v.Blocked == 0),
                    blockedVehicles = navVehicles.Count(v => v.Blocked == 1),
                    totalExpenseAmount = 0m,
                    totalExpenseAmountDisplay = "0.00 SAR",
                    vehicles = resultList
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching vehicles from NAV");
                return StatusCode(500, new { success = false, message = "Failed to fetch vehicles from NAV: " + ex.Message });
            }
        }

        // GET: api/Vehicles/image?name=...&code=...
        [HttpGet("image")]
        public IActionResult GetVehicleImage([FromQuery] string? name, [FromQuery] string? code)
        {
            string url = ResolveVehicleImageUrl(code ?? "", name ?? "");
            return Ok(new { success = true, imageUrl = url });
        }

        public static string ResolveVehicleImageUrl(string code, string name)
        {
            string s = ((name ?? "") + " " + (code ?? "")).ToUpperInvariant();
            if (s.Contains("FORKLIFT")) return "assets/vehicles/forklift.jpg";
            if (s.Contains("COROLLA")) return "assets/vehicles/corolla.jpg";
            if (s.Contains("PICKUP") || s.Contains("HILUX")) return "assets/vehicles/toyota_pickup.jpg";
            if (s.Contains("REFRIGERATOR") || s.Contains("FREEZER")) return "assets/vehicles/hyundai_refrigerator.jpg";
            if (s.Contains("DYNA")) return "assets/vehicles/toyota_dyna.jpg";
            if (s.Contains("ISUZU")) return "assets/vehicles/isuzu_truck.jpg";
            if (s.Contains("SUZUKI")) return "assets/vehicles/suzuki_truck.jpg";
            if (s.Contains("DAIHATSU")) return "assets/vehicles/daihatsu_truck.jpg";
            if (s.Contains("FUSO") || s.Contains("MITSUBISHI")) return "assets/vehicles/mitsubishi_fuso.jpg";
            if (s.Contains("HYUNDAI")) return "assets/vehicles/hyundai_truck.jpg";
            if (s.Contains("TOYOTA")) return "assets/vehicles/toyota_dyna.jpg";
            return "assets/vehicles/commercial_truck.jpg";
        }

        // GET: api/Vehicles/{code}/expenses
        [HttpGet("{code}/expenses")]
        public async Task<IActionResult> GetVehicleExpenses(string code)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(code))
                {
                    return BadRequest(new { success = false, message = "Vehicle code is required." });
                }

                var list = await _context.VehicleExpenses
                    .Where(e => e.VehicleCode == code.Trim())
                    .OrderByDescending(e => e.ExpenseDate)
                    .ThenByDescending(e => e.Id)
                    .Select(e => new
                    {
                        e.Id,
                        e.VehicleCode,
                        e.VehicleName,
                        e.ExpenseType,
                        e.Amount,
                        AmountDisplay = $"{e.Amount:N2} SAR",
                        e.Description,
                        ExpenseDate = e.ExpenseDate.ToString("yyyy-MM-dd"),
                        e.CreatedBy,
                        CreatedAt = e.CreatedAt.ToString("yyyy-MM-dd HH:mm")
                    })
                    .ToListAsync();

                decimal total = list.Sum(x => x.Amount);

                return Ok(new
                {
                    success = true,
                    vehicleCode = code,
                    totalAmount = total,
                    totalAmountDisplay = $"{total:N2} SAR",
                    expenses = list
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting vehicle expenses");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // POST: api/Vehicles/expense
        [HttpPost("expense")]
        public async Task<IActionResult> AddVehicleExpense([FromBody] AddExpenseRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.VehicleCode))
                {
                    return BadRequest(new { success = false, message = "Vehicle code is required." });
                }

                if (request.Amount <= 0)
                {
                    return BadRequest(new { success = false, message = "Expense amount must be greater than zero." });
                }

                var expense = new VehicleExpense
                {
                    VehicleCode = request.VehicleCode.Trim(),
                    VehicleName = (request.VehicleName ?? request.VehicleCode).Trim(),
                    ExpenseType = string.IsNullOrWhiteSpace(request.ExpenseType) ? "General" : request.ExpenseType.Trim(),
                    Amount = request.Amount,
                    Description = request.Description?.Trim(),
                    ExpenseDate = request.ExpenseDate ?? DateTime.Today,
                    CreatedBy = string.IsNullOrWhiteSpace(request.CreatedBy) ? "System" : request.CreatedBy.Trim(),
                    CreatedAt = DateTime.Now
                };

                _context.VehicleExpenses.Add(expense);
                await _context.SaveChangesAsync();

                decimal newTotal = await _context.VehicleExpenses
                    .Where(e => e.VehicleCode == expense.VehicleCode)
                    .SumAsync(e => e.Amount);

                return Ok(new
                {
                    success = true,
                    message = "Expense recorded successfully.",
                    expenseId = expense.Id,
                    newVehicleTotal = newTotal,
                    newVehicleTotalDisplay = $"{newTotal:N2} SAR"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error recording vehicle expense");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        private static string CleanVehicleNameForSearch(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) return "truck";

            string s = name.Trim();

            // Special cases
            if (s.Contains("FORKLIFT", StringComparison.OrdinalIgnoreCase)) return "Forklift";
            if (s.Contains("COROLLA", StringComparison.OrdinalIgnoreCase)) return "Toyota Corolla";
            if (s.Contains("PICKUP", StringComparison.OrdinalIgnoreCase)) return "Toyota Hilux";
            if (s.Contains("DYNA", StringComparison.OrdinalIgnoreCase)) return "Toyota Dyna";
            if (s.Contains("FUSO", StringComparison.OrdinalIgnoreCase)) return "Mitsubishi Fuso Canter";
            if (s.Contains("ISUZU", StringComparison.OrdinalIgnoreCase)) return "Isuzu Elf";
            if (s.Contains("SUZUKI", StringComparison.OrdinalIgnoreCase)) return "Suzuki Carry";
            if (s.Contains("DAIHATSU", StringComparison.OrdinalIgnoreCase)) return "Daihatsu Hijet";
            if (s.Contains("HYUNDAI", StringComparison.OrdinalIgnoreCase)) return "Hyundai Porter";

            // Remove leading plate digits/letters e.g. "1897 ADA " or "S0001-1183 BZA "
            s = Regex.Replace(s, @"^[A-Z0-9\-]+\s+[A-Z]{2,4}\s+", "", RegexOptions.IgnoreCase).Trim();
            s = Regex.Replace(s, @"^\d+\s+", "").Trim();

            return string.IsNullOrWhiteSpace(s) ? "commercial vehicle" : s;
        }

        private static async Task<string?> FetchWikimediaImageAsync(string query, CancellationToken ct)
        {
            try
            {
                string wikiUrl = "https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=" +
                                 Uri.EscapeDataString(query) +
                                 "&gsrlimit=1&prop=pageimages&pithumbsize=320&format=json";

                var request = new HttpRequestMessage(HttpMethod.Get, wikiUrl);
                request.Headers.Add("User-Agent", "DynamicsAltx/1.0 (internal erp)");

                using var response = await _httpClient.SendAsync(request, ct);
                if (!response.IsSuccessStatusCode) return null;

                using var stream = await response.Content.ReadAsStreamAsync(ct);
                using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

                if (doc.RootElement.TryGetProperty("query", out var queryElem) &&
                    queryElem.TryGetProperty("pages", out var pagesElem))
                {
                    foreach (var page in pagesElem.EnumerateObject())
                    {
                        if (page.Value.TryGetProperty("thumbnail", out var thumb) &&
                            thumb.TryGetProperty("source", out var src))
                        {
                            return src.GetString();
                        }
                    }
                }
            }
            catch
            {
                // Graceful fallback on network timeout/offline
            }

            return null;
        }

        private static string? MatchCuratedImage(string name)
        {
            foreach (var kvp in _curatedImages)
            {
                if (name.Contains(kvp.Key, StringComparison.OrdinalIgnoreCase))
                {
                    return kvp.Value;
                }
            }
            return null;
        }

        private class VehicleDto
        {
            public string Code { get; set; } = string.Empty;
            public string Name { get; set; } = string.Empty;
            public byte Blocked { get; set; }
        }
    }

    public class AddExpenseRequest
    {
        public string VehicleCode { get; set; } = string.Empty;
        public string? VehicleName { get; set; }
        public string? ExpenseType { get; set; }
        public decimal Amount { get; set; }
        public string? Description { get; set; }
        public DateTime? ExpenseDate { get; set; }
        public string? CreatedBy { get; set; }
    }
}
