using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class EmployeeDocumentsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public EmployeeDocumentsController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public class EmployeeDocumentDto
        {
            public int Id { get; set; }
            public int EmpId { get; set; }
            public string EnglishName { get; set; } = string.Empty;
            public string ArabicName { get; set; } = string.Empty;
            public string PermanentStatus { get; set; } = string.Empty;
            public DateTime? HealthMedicalDate { get; set; }
            public DateTime? HealthMadrasaDate { get; set; }
            public string? HealthStatus { get; set; }
            public string? IqamaNo { get; set; }
            public DateTime? IqamaExpiryGrego { get; set; }
            public DateTime? IqamaExpiryHijiri { get; set; }
            public string? PassportNo { get; set; }
            public DateTime? PassportIssue { get; set; }
            public DateTime? PassportExpiry { get; set; }
            public DateTime? ContractExpiry { get; set; }
            public string? BloodGroup { get; set; }
        }

        // GET: api/EmployeeDocuments
        [HttpGet]
        public async Task<ActionResult<IEnumerable<EmployeeDocumentDto>>> GetEmployeeDocuments()
        {
            var docs = await _context.EmployeeDocuments.OrderBy(d => d.EmpId).ToListAsync();
            var employees = await _context.Employees.ToListAsync();

            var empDict = employees
                .GroupBy(e => e.EmpId)
                .ToDictionary(g => g.Key, g => g.First());

            var result = docs.Select(d => {
                empDict.TryGetValue(d.EmpId.ToString(), out var emp);
                return new EmployeeDocumentDto
                {
                    Id = d.Id,
                    EmpId = d.EmpId,
                    EnglishName = emp?.EnglishName ?? "",
                    ArabicName = emp?.ArabicName ?? "",
                    PermanentStatus = emp?.PermanentStatus ?? "",
                    HealthMedicalDate = d.HealthMedicalDate,
                    HealthMadrasaDate = d.HealthMadrasaDate,
                    HealthStatus = d.HealthStatus,
                    IqamaNo = d.IqamaNo,
                    IqamaExpiryGrego = d.IqamaExpiryGrego,
                    IqamaExpiryHijiri = d.IqamaExpiryHijiri,
                    PassportNo = d.PassportNo,
                    PassportIssue = d.PassportIssue,
                    PassportExpiry = d.PassportExpiry,
                    ContractExpiry = d.ContractExpiry,
                    BloodGroup = d.BloodGroup
                };
            })
            .Where(dto => !dto.PermanentStatus.Equals("Inactive", StringComparison.OrdinalIgnoreCase))
            .ToList();

            return Ok(result);
        }

        // GET: api/EmployeeDocuments/5
        [HttpGet("{id}")]
        public async Task<ActionResult<EmployeeDocumentDto>> GetEmployeeDocument(int id)
        {
            var doc = await _context.EmployeeDocuments.FindAsync(id);
            if (doc == null) return NotFound();

            var emp = await _context.Employees.FirstOrDefaultAsync(e => e.EmpId == doc.EmpId.ToString());
            if (emp != null && string.Equals(emp.PermanentStatus, "Inactive", StringComparison.OrdinalIgnoreCase))
            {
                return NotFound(new { message = "Employee document is unavailable because the employee's Permanent Status is Inactive." });
            }

            var result = new EmployeeDocumentDto
            {
                Id = doc.Id,
                EmpId = doc.EmpId,
                EnglishName = emp?.EnglishName ?? "",
                ArabicName = emp?.ArabicName ?? "",
                PermanentStatus = emp?.PermanentStatus ?? "",
                HealthMedicalDate = doc.HealthMedicalDate,
                HealthMadrasaDate = doc.HealthMadrasaDate,
                HealthStatus = doc.HealthStatus,
                IqamaNo = doc.IqamaNo,
                IqamaExpiryGrego = doc.IqamaExpiryGrego,
                IqamaExpiryHijiri = doc.IqamaExpiryHijiri,
                PassportNo = doc.PassportNo,
                PassportIssue = doc.PassportIssue,
                PassportExpiry = doc.PassportExpiry,
                ContractExpiry = doc.ContractExpiry,
                BloodGroup = doc.BloodGroup
            };

            return Ok(result);
        }

        // GET: api/EmployeeDocuments/by-emp/1001
        [HttpGet("by-emp/{empId}")]
        public async Task<ActionResult<EmployeeDocumentDto>> GetEmployeeDocumentByEmpId(int empId)
        {
            var doc = await _context.EmployeeDocuments.FirstOrDefaultAsync(d => d.EmpId == empId);
            var emp = await _context.Employees.FirstOrDefaultAsync(e => e.EmpId == empId.ToString());

            if (doc == null)
            {
                return Ok(new EmployeeDocumentDto
                {
                    Id = 0,
                    EmpId = empId,
                    EnglishName = emp?.EnglishName ?? "",
                    ArabicName = emp?.ArabicName ?? "",
                    PermanentStatus = emp?.PermanentStatus ?? ""
                });
            }

            return Ok(new EmployeeDocumentDto
            {
                Id = doc.Id,
                EmpId = doc.EmpId,
                EnglishName = emp?.EnglishName ?? "",
                ArabicName = emp?.ArabicName ?? "",
                PermanentStatus = emp?.PermanentStatus ?? "",
                HealthMedicalDate = doc.HealthMedicalDate,
                HealthMadrasaDate = doc.HealthMadrasaDate,
                HealthStatus = doc.HealthStatus,
                IqamaNo = doc.IqamaNo,
                IqamaExpiryGrego = doc.IqamaExpiryGrego,
                IqamaExpiryHijiri = doc.IqamaExpiryHijiri,
                PassportNo = doc.PassportNo,
                PassportIssue = doc.PassportIssue,
                PassportExpiry = doc.PassportExpiry,
                ContractExpiry = doc.ContractExpiry,
                BloodGroup = doc.BloodGroup
            });
        }

        // POST: api/EmployeeDocuments
        [HttpPost]
        public async Task<ActionResult<EmployeeDocument>> PostEmployeeDocument([FromBody] EmployeeDocument document)
        {
            if (string.IsNullOrWhiteSpace(document.IqamaNo))
            {
                return BadRequest(new { message = "Iqama Number is mandatory." });
            }

            var emp = await _context.Employees.FirstOrDefaultAsync(e => e.EmpId == document.EmpId.ToString());
            if (emp != null && string.Equals(emp.PermanentStatus, "Inactive", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = $"Cannot add document record for Employee ID {document.EmpId} because their Permanent Status is Inactive." });
            }

            if (await _context.EmployeeDocuments.AnyAsync(d => d.EmpId == document.EmpId))
            {
                return BadRequest(new { message = $"Document record already exists for Employee ID {document.EmpId}." });
            }

            _context.EmployeeDocuments.Add(document);

            // Synchronize local employee record
            if (emp != null)
            {
                emp.IqamaNo = document.IqamaNo;
                if (!string.IsNullOrWhiteSpace(document.PassportNo))
                {
                    emp.PassportNo = document.PassportNo;
                }
            }

            await _context.SaveChangesAsync();

            // Synchronize Navision employee table
            await UpdateNavisionEmployeeAsync(document);

            return CreatedAtAction("GetEmployeeDocument", new { id = document.Id }, document);
        }

        // PUT: api/EmployeeDocuments/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutEmployeeDocument(int id, [FromBody] EmployeeDocument document)
        {
            if (id != document.Id) return BadRequest();

            if (string.IsNullOrWhiteSpace(document.IqamaNo))
            {
                return BadRequest(new { message = "Iqama Number is mandatory." });
            }

            var emp = await _context.Employees.FirstOrDefaultAsync(e => e.EmpId == document.EmpId.ToString());
            if (emp != null && string.Equals(emp.PermanentStatus, "Inactive", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = $"Cannot edit document record for Employee ID {document.EmpId} because their Permanent Status is Inactive." });
            }

            if (await _context.EmployeeDocuments.AnyAsync(d => d.EmpId == document.EmpId && d.Id != id))
            {
                return BadRequest(new { message = $"Document record already exists for Employee ID {document.EmpId}." });
            }

            _context.Entry(document).State = EntityState.Modified;

            // Synchronize local employee record
            if (emp != null)
            {
                emp.IqamaNo = document.IqamaNo;
                if (!string.IsNullOrWhiteSpace(document.PassportNo))
                {
                    emp.PassportNo = document.PassportNo;
                }
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!_context.EmployeeDocuments.Any(e => e.Id == id)) return NotFound();
                else throw;
            }

            // Synchronize Navision employee table
            await UpdateNavisionEmployeeAsync(document);

            return NoContent();
        }

        private async Task UpdateNavisionEmployeeAsync(EmployeeDocument document)
        {
            try
            {
                var navConnectionString = _configuration.GetConnectionString("NavisionConnection");
                if (string.IsNullOrEmpty(navConnectionString)) return;

                using var navConnection = new Microsoft.Data.SqlClient.SqlConnection(navConnectionString);
                await navConnection.OpenAsync();

                // Get column names & data types from Navision table
                var columns = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                using (var colCmd = navConnection.CreateCommand())
                {
                    colCmd.CommandText = @"
                        SELECT COLUMN_NAME, DATA_TYPE 
                        FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_NAME = 'House Care Live$Employee'";
                    using var reader = await colCmd.ExecuteReaderAsync();
                    while (await reader.ReadAsync())
                    {
                        var colName = reader.GetString(0);
                        var dataType = reader.GetString(1);
                        columns[colName] = dataType;
                    }
                }

                if (columns.Count == 0) return;

                var setClauses = new List<string>();
                var parameters = new List<Microsoft.Data.SqlClient.SqlParameter>();

                // [Iqama No__Saudi ID] = [IqamaNo]
                if (columns.ContainsKey("Iqama No__Saudi ID"))
                {
                    setClauses.Add("[Iqama No__Saudi ID] = @IqamaNo");
                    parameters.Add(new Microsoft.Data.SqlClient.SqlParameter("@IqamaNo", (object?)document.IqamaNo ?? DBNull.Value));
                }

                // [Iqama Expiry Date(Hirji)] or [Iqama Expiry Date(Hijri)]
                string? hijriColName = null;
                if (columns.ContainsKey("Iqama Expiry Date(Hirji)")) hijriColName = "Iqama Expiry Date(Hirji)";
                else if (columns.ContainsKey("Iqama Expiry Date(Hijri)")) hijriColName = "Iqama Expiry Date(Hijri)";

                if (hijriColName != null)
                {
                    setClauses.Add($"[{hijriColName}] = @IqamaExpiryHijiri");
                    parameters.Add(new Microsoft.Data.SqlClient.SqlParameter("@IqamaExpiryHijiri", (object?)document.IqamaExpiryHijiri ?? DBNull.Value));
                }

                // [Iqama Expiry Date(Greg)]
                if (columns.ContainsKey("Iqama Expiry Date(Greg)"))
                {
                    setClauses.Add("[Iqama Expiry Date(Greg)] = @IqamaExpiryGrego");
                    parameters.Add(new Microsoft.Data.SqlClient.SqlParameter("@IqamaExpiryGrego", (object?)document.IqamaExpiryGrego ?? DBNull.Value));
                }

                // Health Insurance Status: if HealthStatus == 'Active' then 'Active' else 'Removed'
                if (columns.ContainsKey("Health Insurance Status"))
                {
                    var dataType = columns["Health Insurance Status"];
                    string healthStatusVal = string.Equals(document.HealthStatus, "Active", StringComparison.OrdinalIgnoreCase) ? "Active" : "Removed";

                    setClauses.Add("[Health Insurance Status] = @HealthInsuranceStatus");
                    if (dataType.Equals("int", StringComparison.OrdinalIgnoreCase) || 
                        dataType.Equals("tinyint", StringComparison.OrdinalIgnoreCase) || 
                        dataType.Equals("smallint", StringComparison.OrdinalIgnoreCase))
                    {
                        parameters.Add(new Microsoft.Data.SqlClient.SqlParameter("@HealthInsuranceStatus", healthStatusVal == "Active" ? 1 : 2));
                    }
                    else
                    {
                        parameters.Add(new Microsoft.Data.SqlClient.SqlParameter("@HealthInsuranceStatus", healthStatusVal));
                    }
                }

                // [Baladiya Expiry Date] = [HealthMedicalDate]
                if (columns.ContainsKey("Baladiya Expiry Date"))
                {
                    setClauses.Add("[Baladiya Expiry Date] = @HealthMedicalDate");
                    parameters.Add(new Microsoft.Data.SqlClient.SqlParameter("@HealthMedicalDate", (object?)document.HealthMedicalDate ?? DBNull.Value));
                }

                // [Baladiya Training Date] = [HealthMadrasaDate]
                if (columns.ContainsKey("Baladiya Training Date"))
                {
                    setClauses.Add("[Baladiya Training Date] = @HealthMadrasaDate");
                    parameters.Add(new Microsoft.Data.SqlClient.SqlParameter("@HealthMadrasaDate", (object?)document.HealthMadrasaDate ?? DBNull.Value));
                }

                // [Passport No_] = [PassportNo] (if PassportNo is empty then do not update)
                if (columns.ContainsKey("Passport No_") && !string.IsNullOrWhiteSpace(document.PassportNo))
                {
                    setClauses.Add("[Passport No_] = @PassportNo");
                    parameters.Add(new Microsoft.Data.SqlClient.SqlParameter("@PassportNo", document.PassportNo));
                }

                // [Passport Issue Date] = [PassportIssue]
                if (columns.ContainsKey("Passport Issue Date"))
                {
                    setClauses.Add("[Passport Issue Date] = @PassportIssue");
                    parameters.Add(new Microsoft.Data.SqlClient.SqlParameter("@PassportIssue", (object?)document.PassportIssue ?? DBNull.Value));
                }

                // [Passport Expiry Date] = [PassportExpiry]
                if (columns.ContainsKey("Passport Expiry Date"))
                {
                    setClauses.Add("[Passport Expiry Date] = @PassportExpiry");
                    parameters.Add(new Microsoft.Data.SqlClient.SqlParameter("@PassportExpiry", (object?)document.PassportExpiry ?? DBNull.Value));
                }

                // [Contract Expiry Date] = [ContractExpiry]
                if (columns.ContainsKey("Contract Expiry Date"))
                {
                    setClauses.Add("[Contract Expiry Date] = @ContractExpiry");
                    parameters.Add(new Microsoft.Data.SqlClient.SqlParameter("@ContractExpiry", (object?)document.ContractExpiry ?? DBNull.Value));
                }

                // [Blood Group] = [BloodGroup]
                if (columns.ContainsKey("Blood Group"))
                {
                    setClauses.Add("[Blood Group] = @BloodGroup");
                    parameters.Add(new Microsoft.Data.SqlClient.SqlParameter("@BloodGroup", (object?)document.BloodGroup ?? DBNull.Value));
                }

                if (setClauses.Count == 0) return;

                var sql = $@"
                    UPDATE [dbo].[House Care Live$Employee]
                    SET {string.Join(", ", setClauses)}
                    WHERE [No_] = @EmpId";

                parameters.Add(new Microsoft.Data.SqlClient.SqlParameter("@EmpId", document.EmpId.ToString()));

                using var updateCmd = navConnection.CreateCommand();
                updateCmd.CommandText = sql;
                updateCmd.Parameters.AddRange(parameters.ToArray());

                await updateCmd.ExecuteNonQueryAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating Navision employee record: {ex.Message}");
            }
        }

        // DELETE: api/EmployeeDocuments/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEmployeeDocument(int id)
        {
            var doc = await _context.EmployeeDocuments.FindAsync(id);
            if (doc == null) return NotFound();

            _context.EmployeeDocuments.Remove(doc);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Employee Document deleted successfully." });
        }
    }
}
