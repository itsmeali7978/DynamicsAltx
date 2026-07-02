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
            var user = await _context.Users
                .Include(u => u.Profile)
                .ThenInclude(p => p.AllowedPages)
                .FirstOrDefaultAsync(u => u.Email == request.Email);
 
            if (user == null || user.PasswordHash != request.Password)
            {
                return Unauthorized(new { message = "Invalid email or password" });
            }

            var allowedPages = new List<string>();
            string dashboardPage = "dashboard.html";

            if (user.Profile != null)
            {
                dashboardPage = user.Profile.DashboardPage;
                allowedPages = user.Profile.AllowedPages.Select(ap => ap.PagePath).ToList();
                // Always ensure the dashboard landing page itself is accessible
                if (!allowedPages.Contains(dashboardPage))
                    allowedPages.Insert(0, dashboardPage);
            }
            else if (user.Role == "Admin")
            {
                // Fallback list for Admin if no profile is assigned
                allowedPages = new List<string> {
                    "dashboard.html", "employees.html", "absence-marker.html", "absence-report.html",
                    "cashier-closing.html", "closing-reports.html", "users.html", "locations.html",
                    "nationalities.html", "shifts.html", "short-breaks.html", "leave-types.html",
                    "sync.html", "reconciliation.html", "vendors.html", "vendor-profile.html", "bidding-list.html",
                    "bidding-create.html", "voucher-history.html", "announcements.html",
                    "barcode-print.html", "settings.html", "profiles.html"
                };
            }
 
            return Ok(new { 
                message = "Login successful", 
                user = new { 
                    id = user.Id, 
                    email = user.Email,
                    name = user.Name?.Trim(),
                    location = user.Location?.Trim(),
                    role = user.Role,
                    dashboardPage = dashboardPage,
                    allowedPages = allowedPages
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
