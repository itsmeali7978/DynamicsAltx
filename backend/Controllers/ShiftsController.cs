using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ShiftsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ShiftsController(AppDbContext context)
        {
            _context = context;
        }

        private async Task<bool> IsAdmin(string email)
        {
            if (string.IsNullOrEmpty(email)) return false;
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            return user != null && user.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase);
        }

        // GET: api/Shifts?userEmail=...
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Shift>>> GetShifts([FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();

            return await _context.Shifts.OrderBy(s => s.ShiftNo).ToListAsync();
        }

        // GET: api/Shifts/5?userEmail=...
        [HttpGet("{id}")]
        public async Task<ActionResult<Shift>> GetShift(string id, [FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();

            var shift = await _context.Shifts.FindAsync(id);
            if (shift == null) return NotFound();
            return shift;
        }

        // POST: api/Shifts?userEmail=...
        [HttpPost]
        public async Task<ActionResult<Shift>> PostShift([FromBody] Shift shift, [FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();

            if (await _context.Shifts.AnyAsync(s => s.ShiftNo == shift.ShiftNo))
            {
                return BadRequest(new { message = "Shift No already exists." });
            }

            _context.Shifts.Add(shift);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetShift", new { id = shift.ShiftNo, userEmail = userEmail }, shift);
        }

        // PUT: api/Shifts/5?userEmail=...
        [HttpPut("{id}")]
        public async Task<IActionResult> PutShift(string id, [FromBody] Shift shift, [FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();
            if (id != shift.ShiftNo) return BadRequest();

            _context.Entry(shift).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ShiftExists(id)) return NotFound();
                else throw;
            }

            return NoContent();
        }

        // DELETE: api/Shifts/5?userEmail=...
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteShift(string id, [FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();

            var shift = await _context.Shifts.FindAsync(id);
            if (shift == null) return NotFound();

            _context.Shifts.Remove(shift);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Shift deleted successfully." });
        }

        private bool ShiftExists(string id)
        {
            return _context.Shifts.Any(e => e.ShiftNo == id);
        }
    }
}
