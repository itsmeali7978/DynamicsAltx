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
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            // First, find the user by email
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null)
            {
                // In a real application, consider returning a generic "Invalid credentials" message
                // to avoid email enumeration
                return Unauthorized(new { message = "Invalid email or password" });
            }

            // Simple verification (in a real app, use a proper hashing library like BCrypt)
            if (user.PasswordHash != request.Password)
            {
                return Unauthorized(new { message = "Invalid email or password" });
            }

            return Ok(new { message = "Login successful", user = new { id = user.Id, email = user.Email } });
        }

        // Optional: A simple signup endpoint for testing purposes
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
                // Simple pass-through (in a real app, hash the password here!)
                PasswordHash = request.Password
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User created successfully" });
        }
    }
}
