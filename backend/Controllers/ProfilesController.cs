using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ProfilesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProfilesController(AppDbContext context)
        {
            _context = context;
        }

        public class UserProfileDto
        {
            public string ProfileName { get; set; } = string.Empty;
            public string DashboardPage { get; set; } = "dashboard.html";
            public List<string> AllowedPages { get; set; } = new List<string>();
        }

        // GET: api/Profiles
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetProfiles()
        {
            var profiles = await _context.UserProfiles
                .Select(p => new
                {
                    p.Id,
                    p.ProfileName,
                    p.DashboardPage,
                    AllowedPagesCount = p.AllowedPages.Count,
                    AllowedPages = p.AllowedPages.Select(ap => ap.PagePath).ToList()
                })
                .ToListAsync();

            return Ok(profiles);
        }

        // GET: api/Profiles/5
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetProfile(int id)
        {
            var profile = await _context.UserProfiles
                .Include(p => p.AllowedPages)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (profile == null)
            {
                return NotFound(new { message = $"Profile #{id} not found." });
            }

            return Ok(new
            {
                profile.Id,
                profile.ProfileName,
                profile.DashboardPage,
                AllowedPages = profile.AllowedPages.Select(ap => ap.PagePath).ToList()
            });
        }

        // POST: api/Profiles
        [HttpPost]
        public async Task<ActionResult> CreateProfile([FromBody] UserProfileDto dto)
        {
            if (string.IsNullOrEmpty(dto.ProfileName))
            {
                return BadRequest(new { message = "Profile name is required." });
            }

            if (await _context.UserProfiles.AnyAsync(p => p.ProfileName.ToLower() == dto.ProfileName.ToLower()))
            {
                return BadRequest(new { message = $"Profile with name '{dto.ProfileName}' already exists." });
            }

            var profile = new UserProfile
            {
                ProfileName = dto.ProfileName.Trim(),
                DashboardPage = string.IsNullOrEmpty(dto.DashboardPage) ? "dashboard.html" : dto.DashboardPage.Trim()
            };

            foreach (var page in dto.AllowedPages)
            {
                if (!string.IsNullOrEmpty(page))
                {
                    profile.AllowedPages.Add(new ProfilePage { PagePath = page.Trim() });
                }
            }

            _context.UserProfiles.Add(profile);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Profile created successfully", id = profile.Id });
        }

        // PUT: api/Profiles/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProfile(int id, [FromBody] UserProfileDto dto)
        {
            if (string.IsNullOrEmpty(dto.ProfileName))
            {
                return BadRequest(new { message = "Profile name is required." });
            }

            var profile = await _context.UserProfiles
                .Include(p => p.AllowedPages)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (profile == null)
            {
                return NotFound(new { message = $"Profile #{id} not found." });
            }

            if (await _context.UserProfiles.AnyAsync(p => p.Id != id && p.ProfileName.ToLower() == dto.ProfileName.ToLower()))
            {
                return BadRequest(new { message = $"Another profile with name '{dto.ProfileName}' already exists." });
            }

            profile.ProfileName = dto.ProfileName.Trim();
            profile.DashboardPage = string.IsNullOrEmpty(dto.DashboardPage) ? "dashboard.html" : dto.DashboardPage.Trim();

            // Clear old pages and load new ones
            _context.ProfilePages.RemoveRange(profile.AllowedPages);
            profile.AllowedPages.Clear();

            foreach (var page in dto.AllowedPages)
            {
                if (!string.IsNullOrEmpty(page))
                {
                    profile.AllowedPages.Add(new ProfilePage { PagePath = page.Trim() });
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Profile updated successfully" });
        }

        // DELETE: api/Profiles/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProfile(int id)
        {
            var profile = await _context.UserProfiles
                .Include(p => p.AllowedPages)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (profile == null)
            {
                return NotFound(new { message = $"Profile #{id} not found." });
            }

            // Check if any users are assigned to this profile
            var usersCount = await _context.Users.CountAsync(u => u.ProfileId == id);
            if (usersCount > 0)
            {
                return BadRequest(new { message = $"Cannot delete profile. It is currently assigned to {usersCount} user(s)." });
            }

            _context.ProfilePages.RemoveRange(profile.AllowedPages);
            _context.UserProfiles.Remove(profile);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Profile deleted successfully" });
        }
    }
}
