using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class NationalitiesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public NationalitiesController(AppDbContext context)
        {
            _context = context;
        }

        private async Task<bool> IsAdmin(string email)
        {
            if (string.IsNullOrEmpty(email)) return false;
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            return user != null && user.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase);
        }

        // GET: api/Nationalities?userEmail=...
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Nationality>>> GetNationalities([FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();

            return await _context.Nationalities.OrderBy(n => n.Nation).ToListAsync();
        }

        // GET: api/Nationalities/5?userEmail=...
        [HttpGet("{id}")]
        public async Task<ActionResult<Nationality>> GetNationality(int id, [FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();

            var nationality = await _context.Nationalities.FindAsync(id);
            if (nationality == null) return NotFound();
            return nationality;
        }

        // POST: api/Nationalities?userEmail=...
        [HttpPost]
        public async Task<ActionResult<Nationality>> PostNationality([FromBody] Nationality nationality, [FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();

            nationality.Nation = nationality.Nation.Trim().ToUpper();

            if (await _context.Nationalities.AnyAsync(n => n.Nation == nationality.Nation))
            {
                return BadRequest(new { message = "Nationality already exists." });
            }

            _context.Nationalities.Add(nationality);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetNationality", new { id = nationality.Id, userEmail = userEmail }, nationality);
        }

        // PUT: api/Nationalities/5?userEmail=...
        [HttpPut("{id}")]
        public async Task<IActionResult> PutNationality(int id, [FromBody] Nationality nationality, [FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();
            if (id != nationality.Id) return BadRequest();

            nationality.Nation = nationality.Nation.Trim().ToUpper();

            if (await _context.Nationalities.AnyAsync(n => n.Nation == nationality.Nation && n.Id != id))
            {
                return BadRequest(new { message = "Another nationality with this name already exists." });
            }

            _context.Entry(nationality).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!NationalityExists(id)) return NotFound();
                else throw;
            }

            return NoContent();
        }

        // DELETE: api/Nationalities/5?userEmail=...
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNationality(int id, [FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();

            var nationality = await _context.Nationalities.FindAsync(id);
            if (nationality == null) return NotFound();

            _context.Nationalities.Remove(nationality);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Nationality deleted successfully." });
        }

        private bool NationalityExists(int id)
        {
            return _context.Nationalities.Any(e => e.Id == id);
        }
    }
}
