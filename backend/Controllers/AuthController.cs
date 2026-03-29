using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AuthController(AppDbContext context)
        {
            _context = context;
        }

        public class LoginRequest
        {
            public string Email { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
            public string? Name { get; set; }
            public string? Location { get; set; }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null || user.PasswordHash != request.Password)
            {
                return Unauthorized(new { message = "Invalid email or password" });
            }

            return Ok(new { 
                message = "Login successful", 
                user = new { 
                    id = user.Id, 
                    email = user.Email,
                    name = user.Name?.Trim(),
                    location = user.Location?.Trim(),
                    role = user.Role
                } 
            });
        }
        [HttpPost("signup")]
        public async Task<IActionResult> Signup([FromBody] LoginRequest request)
        {
            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            {
                return BadRequest(new { message = "Email already exists" });
            }

            var newUser = new User
            {
                Email = request.Email,
                PasswordHash = request.Password,
                Name = request.Name ?? "New User",
                Location = request.Location ?? "Main Office"
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User created successfully" });
        }
    }
}
