using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VoucherController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public VoucherController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // GET: api/Voucher/fetch/{voucherNo}
        [HttpGet("fetch/{voucherNo}")]
        public async Task<ActionResult> FetchVoucher(string voucherNo)
        {
            try
            {
                // 1. Check if already posted in ERP
                var existing = await _context.VoucherHistories.FirstOrDefaultAsync(v => v.VoucherNo == voucherNo);
                if (existing != null)
                {
                    return BadRequest(new { message = $"Voucher {voucherNo} has already been updated in the ERP database on {existing.TransDate:dd/MM/yyyy}." });
                }

                // 2. Fetch from Navision
                var navConnectionString = _configuration.GetConnectionString("NavisionConnection");
                using (var navConnection = new SqlConnection(navConnectionString))
                {
                    await navConnection.OpenAsync();
                    using (var command = navConnection.CreateCommand())
                    {
                        // Note: The user specified the table [House Care Live$Voucher Entries]
                        // We'll fetch relevant fields. I'll assume some common fields or just what's needed for "details".
                        // Standard Navision Voucher Entry fields might include: [Voucher No_], [Posting Date], [Amount], [Description], [Location Code]
                        command.CommandText = @"
                            SELECT TOP 1 [Voucher No_], [Date], [Amount]
                            FROM [dbo].[House Care Live$Voucher Entries]
                            WHERE [Voucher No_] = @voucherNo";
                        
                        command.Parameters.AddWithValue("@voucherNo", voucherNo);

                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                return Ok(new
                                {
                                    VoucherNo = reader.IsDBNull(0) ? "" : reader.GetString(0),
                                    CreatedDate = reader.IsDBNull(1) ? (DateTime?)null : reader.GetDateTime(1),
                                    Amount = reader.IsDBNull(2) ? 0m : reader.GetDecimal(2)
                                });
                            }
                        }
                    }
                }

                return NotFound(new { message = $"Voucher {voucherNo} is not available in the Navision database." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error fetching voucher: {ex.Message}" });
            }
        }

        // POST: api/Voucher/post
        [HttpPost("post")]
        public async Task<ActionResult> PostVoucher([FromBody] VoucherPostDto dto)
        {
            try
            {
                // Validate existence again to be safe
                var existing = await _context.VoucherHistories.FirstOrDefaultAsync(v => v.VoucherNo == dto.VoucherNo);
                if (existing != null)
                {
                    return BadRequest(new { message = "This voucher has already been posted." });
                }

                // Fetch user to get their location
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.CreatedUser);
                if (user == null)
                {
                    return BadRequest(new { message = $"User with email '{dto.CreatedUser}' not found in the ERP system." });
                }

                var history = new VoucherHistory
                {
                    VoucherNo = dto.VoucherNo,
                    TransDate = dto.TransDate,
                    CreatedDate = dto.CreatedDate,
                    CreatedUser = user.Email,
                    TransLocation = user.Location
                };

                _context.VoucherHistories.Add(history);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Voucher posted successfully to ERP database." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error posting voucher: {ex.Message}" });
            }
        }
    }

    public class VoucherPostDto
    {
        public string VoucherNo { get; set; } = string.Empty;
        public DateTime CreatedDate { get; set; }
        public DateTime TransDate { get; set; }
        public string CreatedUser { get; set; } = string.Empty;
    }
}
