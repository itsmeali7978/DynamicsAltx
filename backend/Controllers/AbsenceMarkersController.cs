using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AbsenceMarkersController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AbsenceMarkersController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/AbsenceMarkers/LeaveTypes
        [HttpGet("LeaveTypes")]
        public async Task<IActionResult> GetLeaveTypes()
        {
            var leaveTypes = await _context.LeaveTypes
                .Select(l => new { l.Id, l.NameEn, l.NameAr })
                .ToListAsync();
            return Ok(leaveTypes);
        }

        // GET: api/AbsenceMarkers/Employee/{empId}
        [HttpGet("Employee/{empId}")]
        public async Task<IActionResult> GetEmployee(string empId)
        {
            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.EmpId == empId);
            if (employee == null)
            {
                return NotFound(new { message = "Employee not found." });
            }
            return Ok(new 
            { 
                empId = employee.EmpId, 
                englishName = employee.EnglishName, 
                arabicName = employee.ArabicName 
            });
        }

        // POST: api/AbsenceMarkers/Create
        [HttpPost("Create")]
        public async Task<IActionResult> Create([FromBody] CreateAbsenceDto dto)
        {
            if (dto == null || string.IsNullOrEmpty(dto.EmployeeNo) || dto.LeaveDates == null || dto.LeaveDates.Count == 0)
            {
                return BadRequest(new { message = "Invalid data provided." });
            }

            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.EmpId == dto.EmployeeNo);
            if (employee == null)
            {
                return NotFound(new { message = "Employee not found." });
            }

            var leaveType = await _context.LeaveTypes.FindAsync(dto.LeaveTypeId);
            if (leaveType == null)
            {
                return NotFound(new { message = "Leave type not found." });
            }

            var createdCount = 0;
            var skippedDates = new List<string>();

            foreach (var date in dto.LeaveDates)
            {
                var dateOnly = date.Date;
                var exists = await _context.AbsenceMarkers.AnyAsync(a => a.EmployeeNo == dto.EmployeeNo && a.LeaveDate == dateOnly);
                if (exists)
                {
                    skippedDates.Add(dateOnly.ToString("yyyy-MM-dd"));
                    continue;
                }

                var absence = new AbsenceMarker
                {
                    EmployeeNo = dto.EmployeeNo,
                    LeaveTypeId = dto.LeaveTypeId,
                    LeaveDate = dateOnly,
                    Location = dto.Location,
                    Comments = dto.Comments,
                    CreatedDate = DateTime.Now,
                    CreatedUser = dto.CreatedUser
                };

                _context.AbsenceMarkers.Add(absence);
                createdCount++;
            }

            if (createdCount > 0)
            {
                await _context.SaveChangesAsync();
            }

            if (skippedDates.Count > 0)
            {
                if (createdCount == 0)
                {
                    return BadRequest(new { message = "Absence already marked for these dates: " + string.Join(", ", skippedDates) });
                }
                return Ok(new { message = $"Absence marked for {createdCount} days. Skipped existing dates: {string.Join(", ", skippedDates)}" });
            }

            return Ok(new { message = "Absence marked successfully." });
        }

        // GET: api/AbsenceMarkers/Report
        [HttpGet("Report")]
        public async Task<IActionResult> GetReport([FromQuery] int month, [FromQuery] int year, [FromQuery] string? employeeNo = null, [FromQuery] string? location = null)
        {
            var query = from a in _context.AbsenceMarkers
                        join e in _context.Employees on a.EmployeeNo equals e.EmpId
                        join l in _context.LeaveTypes on a.LeaveTypeId equals l.Id
                        where a.LeaveDate.Month == month && a.LeaveDate.Year == year
                        select new { a, e, l };

            if (!string.IsNullOrEmpty(employeeNo))
            {
                query = query.Where(x => x.a.EmployeeNo == employeeNo);
            }

            if (!string.IsNullOrEmpty(location))
            {
                query = query.Where(x => x.a.Location == location);
            }

            var list = await query.OrderBy(x => x.a.LeaveDate).ToListAsync();

            var reportData = list.Select(x => new 
            {
                id = x.a.Id,
                employeeNo = x.a.EmployeeNo,
                employeeName = $"{x.e.EnglishName} / {x.e.ArabicName}",
                leaveTypeId = x.a.LeaveTypeId,
                leaveType = $"{x.l.NameEn} / {x.l.NameAr}",
                leaveDate = x.a.LeaveDate.ToString("yyyy-MM-dd"),
                location = x.a.Location,
                comments = x.a.Comments,
                createdDate = x.a.CreatedDate.ToString("yyyy-MM-dd HH:mm:ss"),
                createdUser = x.a.CreatedUser
            });

            return Ok(reportData);
        }

        // PUT: api/AbsenceMarkers/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateAbsenceDto dto)
        {
            if (dto == null || string.IsNullOrEmpty(dto.EmployeeNo))
            {
                return BadRequest(new { message = "Invalid data provided." });
            }

            var absence = await _context.AbsenceMarkers.FindAsync(id);
            if (absence == null)
            {
                return NotFound(new { message = "Absence record not found." });
            }

            // Verify employee
            var employee = await _context.Employees.FirstOrDefaultAsync(e => e.EmpId == dto.EmployeeNo);
            if (employee == null)
            {
                return NotFound(new { message = "Employee not found." });
            }

            // Verify leave type
            var leaveType = await _context.LeaveTypes.FindAsync(dto.LeaveTypeId);
            if (leaveType == null)
            {
                return NotFound(new { message = "Leave type not found." });
            }

            // Check if another absence exists for this employee on this new date
            var dateOnly = dto.LeaveDate.Date;
            if (absence.LeaveDate != dateOnly || absence.EmployeeNo != dto.EmployeeNo)
            {
                var exists = await _context.AbsenceMarkers.AnyAsync(a => a.Id != id && a.EmployeeNo == dto.EmployeeNo && a.LeaveDate == dateOnly);
                if (exists)
                {
                    return BadRequest(new { message = $"Absence already marked for {dto.EmployeeNo} on {dateOnly:yyyy-MM-dd}." });
                }
            }

            absence.EmployeeNo = dto.EmployeeNo;
            absence.LeaveTypeId = dto.LeaveTypeId;
            absence.LeaveDate = dateOnly;
            absence.Location = dto.Location;
            absence.Comments = dto.Comments;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Absence record updated successfully." });
        }

        // DELETE: api/AbsenceMarkers/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var absence = await _context.AbsenceMarkers.FindAsync(id);
            if (absence == null)
            {
                return NotFound(new { message = "Absence record not found." });
            }

            _context.AbsenceMarkers.Remove(absence);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Absence record deleted successfully." });
        }
    }

    public class CreateAbsenceDto
    {
        public string EmployeeNo { get; set; } = string.Empty;
        public int LeaveTypeId { get; set; }
        public List<DateTime> LeaveDates { get; set; } = new List<DateTime>();
        public string Location { get; set; } = string.Empty;
        public string? Comments { get; set; }
        public string CreatedUser { get; set; } = string.Empty;
    }

    public class UpdateAbsenceDto
    {
        public string EmployeeNo { get; set; } = string.Empty;
        public int LeaveTypeId { get; set; }
        public DateTime LeaveDate { get; set; }
        public string Location { get; set; } = string.Empty;
        public string? Comments { get; set; }
    }
}
