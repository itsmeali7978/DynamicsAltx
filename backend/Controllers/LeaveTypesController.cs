using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LeaveTypesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public LeaveTypesController(AppDbContext context)
        {
            _context = context;
        }

        private async Task<bool> IsAdmin(string email)
        {
            if (string.IsNullOrEmpty(email)) return false;
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            return user != null && user.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase);
        }

        // GET: api/LeaveTypes?userEmail=...
        [HttpGet]
        public async Task<ActionResult<IEnumerable<LeaveType>>> GetLeaveTypes([FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();

            return await _context.LeaveTypes.OrderBy(l => l.NameEn).ToListAsync();
        }

        // GET: api/LeaveTypes/5?userEmail=...
        [HttpGet("{id}")]
        public async Task<ActionResult<LeaveType>> GetLeaveType(int id, [FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();

            var leaveType = await _context.LeaveTypes.FindAsync(id);
            if (leaveType == null) return NotFound();
            return leaveType;
        }

        // POST: api/LeaveTypes?userEmail=...
        [HttpPost]
        public async Task<ActionResult<LeaveType>> PostLeaveType([FromBody] LeaveType leaveType, [FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();

            leaveType.NameEn = leaveType.NameEn.Trim();
            leaveType.NameAr = leaveType.NameAr.Trim();

            if (await _context.LeaveTypes.AnyAsync(l => l.NameEn.ToLower() == leaveType.NameEn.ToLower() || l.NameAr == leaveType.NameAr))
            {
                return BadRequest(new { message = "A leave type with this English or Arabic name already exists." });
            }

            _context.LeaveTypes.Add(leaveType);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetLeaveType", new { id = leaveType.Id, userEmail = userEmail }, leaveType);
        }

        // PUT: api/LeaveTypes/5?userEmail=...
        [HttpPut("{id}")]
        public async Task<IActionResult> PutLeaveType(int id, [FromBody] LeaveType leaveType, [FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();
            if (id != leaveType.Id) return BadRequest();

            leaveType.NameEn = leaveType.NameEn.Trim();
            leaveType.NameAr = leaveType.NameAr.Trim();

            if (await _context.LeaveTypes.AnyAsync(l => (l.NameEn.ToLower() == leaveType.NameEn.ToLower() || l.NameAr == leaveType.NameAr) && l.Id != id))
            {
                return BadRequest(new { message = "Another leave type with this name already exists." });
            }

            _context.Entry(leaveType).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!LeaveTypeExists(id)) return NotFound();
                else throw;
            }

            return NoContent();
        }

        // DELETE: api/LeaveTypes/5?userEmail=...
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteLeaveType(int id, [FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();

            var leaveType = await _context.LeaveTypes.FindAsync(id);
            if (leaveType == null) return NotFound();

            _context.LeaveTypes.Remove(leaveType);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Leave type deleted successfully." });
        }

        private bool LeaveTypeExists(int id)
        {
            return _context.LeaveTypes.Any(e => e.Id == id);
        }
    }
}
