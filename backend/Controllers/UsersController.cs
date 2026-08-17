using Backend.Data;
using Backend.Models;
using Backend.Models.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsersController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Users
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetUsers()
        {
            return await _context.Users
                .Select(u => new { 
                    u.Id, 
                    u.Email, 
                    u.Name, 
                    u.Location,
                    ProfileId = u.ProfileId,
                    ProfileName = u.Profile != null ? u.Profile.ProfileName : "Default/Admin"
                })
                .ToListAsync();
        }

        // PUT: api/Users/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto dto)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "User not found" });

            if (await _context.Users.AnyAsync(u => u.Email == dto.Email && u.Id != id))
            {
                return BadRequest(new { message = "Email is already in use by another user" });
            }

            if (!string.IsNullOrWhiteSpace(dto.Name)) user.Name = dto.Name;
            if (!string.IsNullOrWhiteSpace(dto.Email)) user.Email = dto.Email;
            if (!string.IsNullOrWhiteSpace(dto.Location)) user.Location = dto.Location;
            user.ProfileId = dto.ProfileId;

            if (!string.IsNullOrWhiteSpace(dto.Password))
            {
                user.PasswordHash = dto.Password;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "User updated successfully" });
        }

        // PUT: api/Users/5/profile
        [HttpPut("{id}/profile")]
        public async Task<IActionResult> UpdateUserProfile(int id, [FromBody] int? profileId)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "User not found" });

            user.ProfileId = profileId;
            await _context.SaveChangesAsync();
            return Ok(new { message = "User profile updated successfully" });
        }

        // POST: api/Users
        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            {
                return BadRequest(new { message = "Email already exists" });
            }

            var newUser = new User
            {
                Email = dto.Email,
                PasswordHash = dto.Password,
                Name = dto.Name,
                Location = dto.Location,
                ProfileId = dto.ProfileId
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User created successfully" });
        }

        // PUT: api/Users/change-password
        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null || user.PasswordHash != dto.CurrentPassword)
            {
                return Unauthorized(new { message = "Invalid current password" });
            }

            user.PasswordHash = dto.NewPassword;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password changed successfully" });
        }

        // DELETE: api/Users/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();

            if (user.Email == "admin@example.com")
            {
                return BadRequest(new { message = "Cannot delete the primary administrator" });
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User deleted successfully" });
        }
    }
}
