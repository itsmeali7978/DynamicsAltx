using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EmployeesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public EmployeesController(AppDbContext context)
        {
            _context = context;
        }

        private async Task<bool> IsAdmin(string email)
        {
            if (string.IsNullOrEmpty(email)) return false;
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            return user != null && user.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase);
        }

        // GET: api/Employees?userEmail=...
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Employee>>> GetEmployees([FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();

            return await _context.Employees.OrderBy(e => e.EmpId).ToListAsync();
        }

        // GET: api/Employees/5?userEmail=...
        [HttpGet("{id}")]
        public async Task<ActionResult<Employee>> GetEmployee(string id, [FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();

            var employee = await _context.Employees.FindAsync(id);
            if (employee == null) return NotFound();
            return employee;
        }

        // POST: api/Employees?userEmail=...
        [HttpPost]
        public async Task<ActionResult<Employee>> PostEmployee([FromBody] Employee employee, [FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();

            if (await _context.Employees.AnyAsync(e => e.EmpId == employee.EmpId))
            {
                return BadRequest(new { message = "Employee ID already exists." });
            }

            _context.Employees.Add(employee);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetEmployee", new { id = employee.EmpId, userEmail = userEmail }, employee);
        }

        // PUT: api/Employees/5?userEmail=...
        [HttpPut("{id}")]
        public async Task<IActionResult> PutEmployee(string id, [FromBody] Employee employee, [FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();
            if (id != employee.EmpId) return BadRequest();

            _context.Entry(employee).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.Employees.Any(e => e.EmpId == id)) return NotFound();
                else throw;
            }

            return NoContent();
        }

        // DELETE: api/Employees/5?userEmail=...
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEmployee(string id, [FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();

            var employee = await _context.Employees.FindAsync(id);
            if (employee == null) return NotFound();

            _context.Employees.Remove(employee);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Employee deleted successfully." });
        }
    }
}
