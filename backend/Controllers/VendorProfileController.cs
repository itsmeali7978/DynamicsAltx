using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VendorProfileController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public VendorProfileController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public class VendorProfileDto
        {
            public string VendorNo { get; set; } = string.Empty;
            public string ArabicName { get; set; } = string.Empty;
            public string EnglishName { get; set; } = string.Empty;
            public string VatRegNo { get; set; } = string.Empty;
            public string CrNo { get; set; } = string.Empty;
            public string SalesmanName { get; set; } = string.Empty;
            public string SalesmanMobile { get; set; } = string.Empty;
            public bool IsBlocked { get; set; }
            public bool HasSellout { get; set; }
            public bool IsReconciliationValid { get; set; }
        }

        public class PaymentInfoDto
        {
            public string Status { get; set; } = string.Empty;
            public System.DateTime AssignedDate { get; set; }
        }

        [HttpGet("Search")]
        public async Task<ActionResult> SearchVendor([FromQuery] string? vendorNo, [FromQuery] string? vatRegNo, [FromQuery] string? customerId)
        {
            if (string.IsNullOrWhiteSpace(vendorNo) && string.IsNullOrWhiteSpace(vatRegNo))
            {
                return BadRequest(new { message = "Please provide either Vendor No or VAT Registration No." });
            }

            var navConnectionString = _configuration.GetConnectionString("NavisionConnection");
            var results = new List<VendorProfileDto>();

            using (var navConnection = new SqlConnection(navConnectionString))
            {
                await navConnection.OpenAsync();
                using (var command = navConnection.CreateCommand())
                {
                    string whereClause = "";
                    
                    if (!string.IsNullOrWhiteSpace(vendorNo))
                    {
                        whereClause = "[No_] = @vendorNo";
                        command.Parameters.AddWithValue("@vendorNo", vendorNo);
                    }
                    else if (!string.IsNullOrWhiteSpace(vatRegNo))
                    {
                        if (!string.IsNullOrWhiteSpace(customerId))
                        {
                            whereClause = "[VAT Registration No_] = @vatRegNo AND [Vendor Customer ID] = @customerId";
                            command.Parameters.AddWithValue("@vatRegNo", vatRegNo);
                            command.Parameters.AddWithValue("@customerId", customerId);
                        }
                        else
                        {
                            whereClause = "[VAT Registration No_] = @vatRegNo";
                            command.Parameters.AddWithValue("@vatRegNo", vatRegNo);
                        }
                    }

                    command.CommandText = $@"
                        SELECT 
                            [No_], 
                            [Name], 
                            [Name 2], 
                            [VAT Registration No_], 
                            [Vendor CR No_], 
                            [Salesman Name], 
                            [Salesman Mobile No_], 
                            [Blocked],
                            [Reconcilation],
                            [Next Submission Date],
                            [Last Reconcile Date],
                            [Reconcilation Period]
                        FROM [dbo].[House Care Live$Vendor]
                        WHERE {whereClause}
                    ";

                    using (var reader = await command.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            var dto = new VendorProfileDto
                            {
                                VendorNo = reader.IsDBNull(0) ? "" : reader.GetString(0),
                                ArabicName = reader.IsDBNull(1) ? "" : reader.GetString(1),
                                EnglishName = reader.IsDBNull(2) ? "" : reader.GetString(2),
                                VatRegNo = reader.IsDBNull(3) ? "" : reader.GetString(3),
                                CrNo = reader.IsDBNull(4) ? "" : reader.GetString(4),
                                SalesmanName = reader.IsDBNull(5) ? "" : reader.GetString(5),
                                SalesmanMobile = reader.IsDBNull(6) ? "" : reader.GetString(6),
                                IsBlocked = !reader.IsDBNull(7) && reader.GetInt32(7) != 0
                            };
                            
                            // Reconcilation logic
                            int reconcilationValue = reader.IsDBNull(8) ? 0 : System.Convert.ToInt32(reader.GetValue(8));
                            if (reconcilationValue == 0)
                            {
                                dto.IsReconciliationValid = true;
                            }
                            else
                            {
                                var nextSubmissionDate = reader.IsDBNull(9) ? System.DateTime.MinValue : reader.GetDateTime(9);
                                if (nextSubmissionDate > new System.DateTime(1753, 1, 1))
                                {
                                    dto.IsReconciliationValid = nextSubmissionDate.Date >= System.DateTime.Today;
                                }
                                else
                                {
                                    var lastReconcileDate = reader.IsDBNull(10) ? System.DateTime.MinValue : reader.GetDateTime(10);
                                    var reconcilationPeriod = reader.IsDBNull(11) ? 0 : System.Convert.ToInt32(reader.GetValue(11)); 
                                    
                                    // Handle string/decimal if necessary, let's assume it's integer for days
                                    if (lastReconcileDate > new System.DateTime(1753, 1, 1))
                                    {
                                        var newDate = lastReconcileDate.AddDays(reconcilationPeriod);
                                        dto.IsReconciliationValid = newDate.Date >= System.DateTime.Today;
                                    }
                                    else
                                    {
                                        dto.IsReconciliationValid = false;
                                    }
                                }
                            }

                            results.Add(dto);
                        }
                    }
                }
            }

            if (results.Count == 0)
            {
                return NotFound(new { message = "Vendor not found in Navision." });
            }
            
            if (results.Count > 1 && string.IsNullOrWhiteSpace(vendorNo))
            {
                // Multiple vendors found for this VAT No, and user didn't provide Customer Id yet
                return StatusCode(409, new { 
                    message = "Multiple vendors found with this VAT Registration No. Please provide the Customer ID.",
                    requiresCustomerId = true 
                });
            }

            var selectedVendor = results.First();

            // Check Sellout Status
            using (var navConnection = new SqlConnection(navConnectionString))
            {
                await navConnection.OpenAsync();
                using (var command = navConnection.CreateCommand())
                {
                    command.CommandText = @"
                        SELECT COUNT(*) 
                        FROM [dbo].[House Care Live$Shelf Information1]
                        WHERE [Type] = 3 AND [Document Status] = 0 AND [Vendor No_] = @vendorNo
                    ";
                    command.Parameters.AddWithValue("@vendorNo", selectedVendor.VendorNo);
                    var count = (int)await command.ExecuteScalarAsync();
                    selectedVendor.HasSellout = count > 0;
                }
            }

            return Ok(selectedVendor);
        }

        [HttpGet("Payments")]
        public async Task<IActionResult> GetPayments([FromQuery] string vendorNo)
        {
            if (string.IsNullOrWhiteSpace(vendorNo))
                return BadRequest(new { message = "Vendor No is required." });

            var results = new List<PaymentInfoDto>();
            var navConnectionString = _configuration.GetConnectionString("NavisionConnection");

            try
            {
                using (var navConnection = new SqlConnection(navConnectionString))
                {
                    await navConnection.OpenAsync();
                    using (var command = navConnection.CreateCommand())
                    {
                        command.CommandText = @"
                            SELECT 'Pending' AS Status, [Assigned Date]
                            FROM [dbo].[House Care Live$Shelf Information1]
                            WHERE [Vendor No_] = @vendorNo AND [Type] = 0 AND [Document Status] = 0

                            UNION ALL

                            SELECT 'Approved' AS Status, [Assigned Date]
                            FROM [dbo].[House Care Live$Shelf Information1]
                            WHERE [Vendor No_] = @vendorNo AND [Type] = 0 AND [Payment Method] = 0 AND [Document Status] = 1

                            UNION ALL

                            SELECT 'Approved' AS Status, [Assigned Date]
                            FROM [dbo].[House Care Live$Shelf Information1]
                            WHERE [Vendor No_] = @vendorNo AND [Type] = 0 AND [Payment Method] = 1 AND [Document Status] = 3 AND [Check Collected]=0
                        ";
                        command.Parameters.AddWithValue("@vendorNo", vendorNo);

                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                results.Add(new PaymentInfoDto
                                {
                                    Status = reader.GetString(0),
                                    AssignedDate = reader.IsDBNull(1) ? System.DateTime.MinValue : reader.GetDateTime(1)
                                });
                            }
                        }
                    }
                }
                return Ok(results);
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching payment info.", details = ex.Message });
            }
        }
    }
}
