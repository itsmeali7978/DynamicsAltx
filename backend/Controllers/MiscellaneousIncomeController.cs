using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MiscellaneousIncomeController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MiscellaneousIncomeController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/MiscellaneousIncome/post
        [HttpPost("post")]
        public async Task<ActionResult> PostEntry([FromBody] MiscellaneousIncomeDto dto)
        {
            try
            {
                if (dto.EntryType != "Opening Balance" && dto.EntryType != "Income" && dto.EntryType != "Expense")
                {
                    return BadRequest(new { message = "Invalid Entry Type." });
                }

                if (dto.Amount <= 0)
                {
                    return BadRequest(new { message = "Amount must be greater than zero." });
                }

                if (dto.EntryType == "Opening Balance")
                {
                    var openingBalanceExists = await _context.MiscellaneousIncomes.AnyAsync(m => m.EntryType == "Opening Balance");
                    if (openingBalanceExists)
                    {
                        return BadRequest(new { message = "An Opening Balance has already been entered. The system only allows a single Opening Balance entry." });
                    }
                }

                var entry = new MiscellaneousIncome
                {
                    EntryType = dto.EntryType,
                    Amount = dto.Amount,
                    Remarks = dto.Remarks,
                    TransactionDate = dto.TransactionDate.Date,
                    CreatedAt = DateTime.UtcNow
                };

                _context.MiscellaneousIncomes.Add(entry);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Entry saved successfully." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error saving entry: {ex.Message}" });
            }
        }

        // GET: api/MiscellaneousIncome/balance
        [HttpGet("balance")]
        public async Task<ActionResult> GetBalance()
        {
            try
            {
                var incomes = await _context.MiscellaneousIncomes
                    .Where(m => m.EntryType == "Opening Balance" || m.EntryType == "Income")
                    .SumAsync(m => m.Amount);

                var expenses = await _context.MiscellaneousIncomes
                    .Where(m => m.EntryType == "Expense")
                    .SumAsync(m => m.Amount);

                var balance = incomes - expenses;

                return Ok(new { balance = balance });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error calculating balance: {ex.Message}" });
            }
        }

        // GET: api/MiscellaneousIncome/list
        [HttpGet("list")]
        public async Task<ActionResult> GetRecentEntries([FromQuery] DateTime? date, [FromQuery] string? type)
        {
            try
            {
                var query = _context.MiscellaneousIncomes.AsQueryable();

                if (date.HasValue)
                {
                    query = query.Where(m => m.TransactionDate.Date == date.Value.Date);
                }

                if (!string.IsNullOrEmpty(type))
                {
                    query = query.Where(m => m.EntryType == type);
                }

                var entries = await query
                    .OrderByDescending(m => m.CreatedAt)
                    .Take(50)
                    .ToListAsync();
                return Ok(entries);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error fetching entries: {ex.Message}" });
            }
        }
    }

    public class MiscellaneousIncomeDto
    {
        public string EntryType { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string? Remarks { get; set; }
        public DateTime TransactionDate { get; set; }
    }
}
