using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SyncController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public SyncController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        private async Task<bool> IsAdmin(string email)
        {
            if (string.IsNullOrEmpty(email)) return false;
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            return user != null && user.Role.Equals("Admin", StringComparison.OrdinalIgnoreCase);
        }

        [HttpGet("list")]
        public async Task<ActionResult> GetSyncList([FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();

            var list = new List<object>
            {
                new { Category = "Employees", Description = "Sync employee records from Navision", LastSync = "Unknown" }
            };

            return Ok(list);
        }

        [HttpPost("employees")]
        public async Task<ActionResult> SyncEmployees([FromQuery] string userEmail)
        {
            if (!await IsAdmin(userEmail)) return Forbid();

            try
            {
                // 1. Get existing employee IDs for deduplication
                var idsList = await _context.Employees.Select(e => e.EmpId).ToListAsync();
                var existingIds = idsList.ToHashSet();

                // 2. Fetch from Navision
                var navConnectionString = _configuration.GetConnectionString("NavisionConnection");
                var newEmployees = new List<Employee>();

                using (var navConnection = new SqlConnection(navConnectionString))
                {
                    await navConnection.OpenAsync();
                    using (var command = navConnection.CreateCommand())
                    {
                        // Navision Employee table structure for "House Care Live"
                        command.CommandText = @"
                            SELECT 
                                [No_], 
                                [First Name], [Middle Name], [Last Name], 
                                [Employee Name Arabic], 
                                [Gender], 
                                [Mobile Phone No_], 
                                [Birth Date], 
                                [Department Code], 
                                [Global Dimension 2 Code], 
                                [Iqama No__Saudi ID], 
                                [Passport No_], 
                                [Employment Date], 
                                [Status]
                            FROM [dbo].[House Care Live$Employee]";

                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                var empId = reader.IsDBNull(0) ? "" : reader.GetString(0).Trim();
                                
                                // Skip if empty or already exists in local ERP
                                if (string.IsNullOrEmpty(empId) || existingIds.Contains(empId)) continue;

                                // Mapping Logic per User Requirements:
                                
                                // [EnglishName] = [First Name] + [Middle Name] + [Last Name]
                                var first = reader.IsDBNull(1) ? "" : reader.GetString(1).Trim();
                                var middle = reader.IsDBNull(2) ? "" : reader.GetString(2).Trim();
                                var last = reader.IsDBNull(3) ? "" : reader.GetString(3).Trim();
                                var englishName = $"{first} {middle} {last}".Replace("  ", " ").Trim();

                                // [ArabicName] = [Employee Name Arabic]
                                var arabicName = reader.IsDBNull(4) ? "" : reader.GetString(4).Trim();

                                // [Gender] mapping: 1 -> Female, 2 -> Male, 0 -> Blank
                                var genderVal = reader.IsDBNull(5) ? 0 : reader.GetInt32(5);
                                var gender = genderVal == 1 ? "Female" : (genderVal == 2 ? "Male" : "");

                                // [MobileNo] = [Mobile Phone No_]
                                var mobileNo = reader.IsDBNull(6) ? "" : reader.GetString(6).Trim();

                                // [DOB] = [Birth Date]
                                DateTime? dob = reader.IsDBNull(7) ? (DateTime?)null : reader.GetDateTime(7);

                                // [JobTitle] = [Department Code]
                                var jobTitle = reader.IsDBNull(8) ? "" : reader.GetString(8).Trim();

                                // [LocationCode] = [Global Dimension 2 Code]
                                var locationCode = reader.IsDBNull(9) ? "" : reader.GetString(9).Trim();

                                // [IqamaNo] = [Iqama No__Saudi ID]
                                var iqamaNo = reader.IsDBNull(10) ? "" : reader.GetString(10).Trim();

                                // [PassportNo] = [Passport No_]
                                var passportNo = reader.IsDBNull(11) ? "" : reader.GetString(11).Trim();

                                // [DateOfJoin] = [Employment Date]
                                DateTime? doj = reader.IsDBNull(12) ? (DateTime?)null : reader.GetDateTime(12);

                                // [Status] mapping: 0 -> Active, others -> Inactive
                                var statusVal = reader.IsDBNull(13) ? -1 : reader.GetInt32(13);
                                var status = statusVal == 0 ? "Active" : "Inactive";

                                newEmployees.Add(new Employee
                                {
                                    EmpId = empId,
                                    EnglishName = englishName,
                                    ArabicName = arabicName,
                                    Gender = gender,
                                    MobileNo = mobileNo,
                                    DOB = dob,
                                    JobTitle = jobTitle,
                                    LocationCode = locationCode,
                                    IqamaNo = iqamaNo,
                                    PassportNo = passportNo,
                                    DateOfJoin = doj,
                                    Status = status,
                                    // Initialize other non-nullable string fields to avoid DB constraint errors
                                    NationalityCode = "",
                                    Profession = jobTitle,
                                    ShiftNo = "",
                                    Section = "",
                                    BloodGroup = "",
                                    HealthStatus = "Active"
                                });
                            }
                        }
                    }
                }

                // 3. Perform Batch Insert
                if (newEmployees.Any())
                {
                    // EF Core batches these effectively, but we can process in chunks for extreme cases
                    const int batchSize = 500;
                    for (int i = 0; i < newEmployees.Count; i += batchSize)
                    {
                        var batch = newEmployees.Skip(i).Take(batchSize).ToList();
                        _context.Employees.AddRange(batch);
                        await _context.SaveChangesAsync();
                    }
                }

                return Ok(new { message = $"Successfully synchronized {newEmployees.Count} new employee records from Navision." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error syncing employees: {ex.Message}" });
            }
        }
    }
}
