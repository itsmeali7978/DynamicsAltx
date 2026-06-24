using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ShortBreaksController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ShortBreaksController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/ShortBreaks/Employee/{empId}
        [HttpGet("Employee/{empId}")]
        public async Task<IActionResult> GetEmployeeName(string empId)
        {
            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.EmpId == empId);
            if (employee == null)
            {
                return NotFound(new { message = "Employee not found." });
            }
            return Ok(new { empId = employee.EmpId, employeeName = employee.EnglishName });
        }

        // GET: api/ShortBreaks/Open
        [HttpGet("Open")]
        public async Task<IActionResult> GetOpenBreaks()
        {
            var openBreaks = await _context.ShortBreaks
                .Where(sb => sb.Status == "Open")
                .Join(_context.Employees,
                      sb => sb.EmpId,
                      e => e.EmpId,
                      (sb, e) => new
                      {
                          id = sb.Id,
                          empId = sb.EmpId,
                          employeeName = e.EnglishName,
                          breakStart = sb.BreakStart,
                          status = sb.Status
                      })
                .OrderByDescending(x => x.breakStart)
                .ToListAsync();

            return Ok(openBreaks);
        }

        // POST: api/ShortBreaks/Create
        [HttpPost("Create")]
        public async Task<IActionResult> CreateBreak([FromBody] CreateBreakDto dto)
        {
            if (string.IsNullOrEmpty(dto.EmpId))
            {
                return BadRequest(new { message = "Employee ID is required." });
            }

            var employeeExists = await _context.Employees.AnyAsync(e => e.EmpId == dto.EmpId);
            if (!employeeExists)
            {
                return NotFound(new { message = "Employee not found." });
            }

            // Check if already an open break exists
            var existingOpenBreak = await _context.ShortBreaks
                .FirstOrDefaultAsync(sb => sb.EmpId == dto.EmpId && sb.Status == "Open");

            if (existingOpenBreak != null)
            {
                return BadRequest(new { message = "An open break already exists for this employee." });
            }

            var newBreak = new ShortBreak
            {
                EmpId = dto.EmpId,
                BreakStart = dto.BreakStart,
                Status = "Open"
            };

            _context.ShortBreaks.Add(newBreak);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Break started successfully.", id = newBreak.Id });
        }

        // PUT: api/ShortBreaks/Close/{id}
        [HttpPut("Close/{id}")]
        public async Task<IActionResult> CloseBreak(int id, [FromBody] CloseBreakDto dto)
        {
            var existingBreak = await _context.ShortBreaks.FindAsync(id);
            if (existingBreak == null || existingBreak.Status != "Open")
            {
                return NotFound(new { message = "Open break not found or already closed." });
            }

            if (dto.BreakEnd < existingBreak.BreakStart)
            {
                return BadRequest(new { message = "Break End time cannot be earlier than Break Start time." });
            }

            existingBreak.BreakEnd = dto.BreakEnd;
            existingBreak.TotalMinutes = (int)Math.Round((dto.BreakEnd - existingBreak.BreakStart).TotalMinutes);
            existingBreak.Status = "Closed";

            await _context.SaveChangesAsync();

            return Ok(new { message = "Break closed successfully.", totalMinutes = existingBreak.TotalMinutes });
        }
    }

    public class CreateBreakDto
    {
        public string EmpId { get; set; }
        public DateTime BreakStart { get; set; }
    }

    public class CloseBreakDto
    {
        public DateTime BreakEnd { get; set; }
    }
}
