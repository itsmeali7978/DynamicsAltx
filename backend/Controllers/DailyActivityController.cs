using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using Backend.Data;
using Backend.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Backend.Controllers
{
    public class DailyActivityDto
    {
        public DateTime ActivityDate { get; set; }
        public int ItemNo { get; set; }
        public string? DescEng { get; set; }
        public string? DescAra { get; set; }
        public decimal ProducedQty { get; set; }
        public decimal ExpiredQty { get; set; }
        public string? ExpiryReason { get; set; }
        public string? Notes { get; set; }
        public string? CreatedBy { get; set; }
    }

    [Route("api/[controller]")]
    [ApiController]
    public class DailyActivityController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public DailyActivityController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // GET: api/DailyActivity/item-lookup/1001
        [HttpGet("item-lookup/{itemNoStr}")]
        public async Task<IActionResult> LookupItem(string itemNoStr)
        {
            try
            {
                if (!int.TryParse(itemNoStr, out int itemNo))
                {
                    return Ok(new { itemNo = itemNoStr, descEng = "", descAra = "", found = false });
                }

                // 1. Try local AltxItems table
                var localItem = await _context.AltxItems.FirstOrDefaultAsync(x => x.ItemNo == itemNo);
                if (localItem != null)
                {
                    return Ok(new
                    {
                        itemNo = localItem.ItemNo,
                        descEng = localItem.DescEng ?? "",
                        descAra = localItem.DescAra ?? "",
                        found = true
                    });
                }

                // 2. Fallback to Navision Item table
                var connectionString = _configuration.GetConnectionString("NavisionConnection") 
                                     ?? _configuration.GetConnectionString("DefaultConnection");

                if (!string.IsNullOrEmpty(connectionString))
                {
                    using (var conn = new SqlConnection(connectionString))
                    {
                        await conn.OpenAsync();
                        string sql = @"
                            SELECT TOP 1 [No_], [Description 2], [Description]
                            FROM [dbo].[House Care Live$Item]
                            WHERE [No_] = @ItemNoStr";

                        using (var cmd = new SqlCommand(sql, conn))
                        {
                            cmd.Parameters.AddWithValue("@ItemNoStr", itemNoStr);

                            using (var reader = await cmd.ExecuteReaderAsync())
                            {
                                if (await reader.ReadAsync())
                                {
                                    string descEng = reader["Description 2"] != DBNull.Value ? reader["Description 2"].ToString() ?? "" : "";
                                    string descAra = reader["Description"] != DBNull.Value ? reader["Description"].ToString() ?? "" : "";

                                    return Ok(new
                                    {
                                        itemNo = itemNo,
                                        descEng = descEng,
                                        descAra = descAra,
                                        found = true
                                    });
                                }
                            }
                        }
                    }
                }

                return Ok(new { itemNo = itemNo, descEng = "", descAra = "", found = false });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error looking up item", error = ex.Message });
            }
        }

        // GET: api/DailyActivity?date=2026-09-05
        [HttpGet]
        public async Task<IActionResult> GetActivities([FromQuery] string? date)
        {
            try
            {
                var query = _context.DailyActivities.AsQueryable();

                if (!string.IsNullOrWhiteSpace(date) && DateTime.TryParse(date, out DateTime parsedDate))
                {
                    query = query.Where(a => a.ActivityDate.Date == parsedDate.Date);
                }

                var list = await query
                    .OrderBy(a => a.ActivityDate)
                    .ThenBy(a => a.Id)
                    .ToListAsync();

                return Ok(list);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching activities", error = ex.Message });
            }
        }

        // POST: api/DailyActivity
        [HttpPost]
        public async Task<IActionResult> CreateActivity([FromBody] DailyActivityDto dto)
        {
            try
            {
                if (dto == null)
                    return BadRequest("Invalid payload.");

                // If description is not supplied, auto fetch
                string descEng = dto.DescEng ?? "";
                string descAra = dto.DescAra ?? "";

                if (string.IsNullOrWhiteSpace(descEng) && string.IsNullOrWhiteSpace(descAra))
                {
                    var localItem = await _context.AltxItems.FirstOrDefaultAsync(x => x.ItemNo == dto.ItemNo);
                    if (localItem != null)
                    {
                        descEng = localItem.DescEng ?? "";
                        descAra = localItem.DescAra ?? "";
                    }
                }

                var entity = new DailyActivity
                {
                    ActivityDate = dto.ActivityDate.Date,
                    ItemNo = dto.ItemNo,
                    DescEng = descEng,
                    DescAra = descAra,
                    ProducedQty = dto.ProducedQty,
                    ExpiredQty = dto.ExpiredQty,
                    ExpiryReason = dto.ExpiryReason,
                    Notes = dto.Notes,
                    CreatedBy = dto.CreatedBy ?? "System",
                    CreatedAt = DateTime.UtcNow
                };

                _context.DailyActivities.Add(entity);
                await _context.SaveChangesAsync();

                return Ok(entity);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error creating activity", error = ex.Message });
            }
        }

        // PUT: api/DailyActivity/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateActivity(int id, [FromBody] DailyActivityDto dto)
        {
            try
            {
                var entity = await _context.DailyActivities.FindAsync(id);
                if (entity == null)
                {
                    return NotFound(new { message = "Activity record not found" });
                }

                entity.ActivityDate = dto.ActivityDate.Date;
                entity.ItemNo = dto.ItemNo;
                entity.DescEng = dto.DescEng;
                entity.DescAra = dto.DescAra;
                entity.ProducedQty = dto.ProducedQty;
                entity.ExpiredQty = dto.ExpiredQty;
                entity.ExpiryReason = dto.ExpiryReason;
                entity.Notes = dto.Notes;

                await _context.SaveChangesAsync();
                return Ok(entity);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating activity", error = ex.Message });
            }
        }

        // DELETE: api/DailyActivity/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteActivity(int id)
        {
            try
            {
                var entity = await _context.DailyActivities.FindAsync(id);
                if (entity == null)
                {
                    return NotFound(new { message = "Activity record not found" });
                }

                _context.DailyActivities.Remove(entity);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Activity record deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting activity", error = ex.Message });
            }
        }
    }
}
