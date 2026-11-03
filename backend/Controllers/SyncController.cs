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
                // 1. Fetch existing local employees dictionary
                var existingEmployees = await _context.Employees.ToDictionaryAsync(e => e.EmpId);
                var newEmployees = new List<Employee>();
                int updatedCount = 0;

                // 2. Fetch from Navision
                var navConnectionString = _configuration.GetConnectionString("NavisionConnection");

                using (var navConnection = new SqlConnection(navConnectionString))
                {
                    await navConnection.OpenAsync();
                    using (var command = navConnection.CreateCommand())
                    {
                        // Navision Employee table query including [Grounds for Term_ Code]
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
                                [Status],
                                [Grounds for Term_ Code]
                            FROM [dbo].[House Care Live$Employee]";

                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                var empId = reader.IsDBNull(0) ? "" : reader.GetString(0).Trim();
                                if (string.IsNullOrEmpty(empId)) continue;

                                // Mapping Logic:
                                var first = reader.IsDBNull(1) ? "" : reader.GetString(1).Trim();
                                var middle = reader.IsDBNull(2) ? "" : reader.GetString(2).Trim();
                                var last = reader.IsDBNull(3) ? "" : reader.GetString(3).Trim();
                                var englishName = $"{first} {middle} {last}".Replace("  ", " ").Trim();

                                var arabicName = reader.IsDBNull(4) ? "" : reader.GetString(4).Trim();

                                var genderVal = reader.IsDBNull(5) ? 0 : reader.GetInt32(5);
                                var gender = genderVal == 1 ? "Female" : (genderVal == 2 ? "Male" : "");

                                var mobileNo = reader.IsDBNull(6) ? "" : reader.GetString(6).Trim();
                                DateTime? dob = reader.IsDBNull(7) ? (DateTime?)null : reader.GetDateTime(7);
                                var jobTitle = reader.IsDBNull(8) ? "" : reader.GetString(8).Trim();
                                var locationCode = reader.IsDBNull(9) ? "" : reader.GetString(9).Trim();
                                var iqamaNo = reader.IsDBNull(10) ? "" : reader.GetString(10).Trim();
                                var passportNo = reader.IsDBNull(11) ? "" : reader.GetString(11).Trim();
                                DateTime? doj = reader.IsDBNull(12) ? (DateTime?)null : reader.GetDateTime(12);

                                var statusVal = reader.IsDBNull(13) ? -1 : reader.GetInt32(13);
                                var status = statusVal == 0 ? "Active" : "Inactive";

                                // Grounds for Term_ Code mapping logic:
                                // If [Grounds for Term_ Code] <> blank -> PermanentStatus = "Inactive"
                                // If [Grounds for Term_ Code] == '' -> PermanentStatus = "Active"
                                string groundsForTermCode = reader.IsDBNull(14) ? "" : reader.GetString(14).Trim();
                                string permanentStatus = !string.IsNullOrEmpty(groundsForTermCode) ? "Inactive" : "Active";

                                if (existingEmployees.TryGetValue(empId, out var existingEmp))
                                {
                                    // Update existing local record with synced PermanentStatus and core fields
                                    existingEmp.EnglishName = englishName;
                                    existingEmp.ArabicName = arabicName;
                                    existingEmp.Gender = gender;
                                    existingEmp.MobileNo = mobileNo;
                                    existingEmp.DOB = dob;
                                    existingEmp.JobTitle = jobTitle;
                                    existingEmp.LocationCode = locationCode;
                                    existingEmp.IqamaNo = iqamaNo;
                                    existingEmp.PassportNo = passportNo;
                                    existingEmp.DateOfJoin = doj;
                                    existingEmp.Status = status;
                                    existingEmp.PermanentStatus = permanentStatus;

                                    updatedCount++;
                                }
                                else
                                {
                                    // Add new record
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
                                        PermanentStatus = permanentStatus,
                                        NationalityCode = "",
                                        Profession = jobTitle,
                                        ShiftNo = "",
                                        Section = ""
                                    });
                                }
                            }
                        }
                    }
                }

                // 3. Save new and updated records
                if (newEmployees.Any())
                {
                    _context.Employees.AddRange(newEmployees);
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = $"Successfully synchronized {newEmployees.Count} new and updated {updatedCount} employee records from Navision." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error syncing employees: {ex.Message}" });
            }
        }
    }
}
