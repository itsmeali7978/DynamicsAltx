using Backend.Data;
using Backend.Helpers;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using System;
using System.Linq;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CashierClosingController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CashierClosingController(AppDbContext context)
        {
            _context = context;
        }

        public class CashierVerifyRequest
        {
            public string LocationCode { get; set; }
            public DateTime Date { get; set; }
            public string StartingInvoiceNo { get; set; }
            public string ClosingInvoiceNo { get; set; }
            public string StartingCreditMemoNo { get; set; }
            public string ClosingCreditMemoNo { get; set; }
        }

        // POST: api/CashierClosing/Verify
        [HttpPost("Verify")]
        public async Task<ActionResult> Verify([FromBody] CashierVerifyRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.LocationCode))
            {
                return BadRequest(new { message = "Location Code is required." });
            }

            var location = await _context.Locations.FirstOrDefaultAsync(l => l.LocationCode == request.LocationCode);
            if (location == null)
            {
                return NotFound(new { message = $"Location '{request.LocationCode}' not found." });
            }

            string plainPassword = string.IsNullOrEmpty(location.Password)
                ? "" : EncryptionHelper.Decrypt(location.Password);

            var connStr = $"Server={location.IPAddress};Database={location.DbName};" +
                          $"User Id={location.Username};Password={plainPassword};" +
                          $"TrustServerCertificate=True;Connect Timeout=15;";

            DateTime toDate = request.Date.Date;
            DateTime fromDate = toDate.AddDays(-1);

            try
            {
                using (var conn = new SqlConnection(connStr))
                {
                    await conn.OpenAsync();

                    bool invoiceTableExists = await CheckTableExists(conn, "House Care Live$Sales Invoice Header");
                    bool creditMemoTableExists = await CheckTableExists(conn, "House Care Live$Sales Cr_Memo Header");

                    if (!string.IsNullOrEmpty(request.StartingInvoiceNo) || !string.IsNullOrEmpty(request.ClosingInvoiceNo))
                    {
                        if (!invoiceTableExists) return BadRequest(new { message = "Sales Invoice Header table not found in ERP." });
                        
                        if (!string.IsNullOrEmpty(request.StartingInvoiceNo))
                        {
                            if (!await DocumentExists(conn, "House Care Live$Sales Invoice Header", request.StartingInvoiceNo, fromDate, toDate))
                                return BadRequest(new { message = $"Starting Invoice No '{request.StartingInvoiceNo}' not found between {fromDate:yyyy-MM-dd} and {toDate:yyyy-MM-dd}." });
                        }
                        if (!string.IsNullOrEmpty(request.ClosingInvoiceNo))
                        {
                            if (!await DocumentExists(conn, "House Care Live$Sales Invoice Header", request.ClosingInvoiceNo, fromDate, toDate))
                                return BadRequest(new { message = $"Closing Invoice No '{request.ClosingInvoiceNo}' not found between {fromDate:yyyy-MM-dd} and {toDate:yyyy-MM-dd}." });
                        }
                    }

                    if (!string.IsNullOrEmpty(request.StartingCreditMemoNo) || !string.IsNullOrEmpty(request.ClosingCreditMemoNo))
                    {
                        if (!creditMemoTableExists) return BadRequest(new { message = "Sales Cr_Memo Header table not found in ERP." });

                        if (!string.IsNullOrEmpty(request.StartingCreditMemoNo))
                        {
                            if (!await DocumentExists(conn, "House Care Live$Sales Cr_Memo Header", request.StartingCreditMemoNo, fromDate, toDate))
                                return BadRequest(new { message = $"Starting Credit Memo No '{request.StartingCreditMemoNo}' not found between {fromDate:yyyy-MM-dd} and {toDate:yyyy-MM-dd}." });
                        }
                        if (!string.IsNullOrEmpty(request.ClosingCreditMemoNo))
                        {
                            if (!await DocumentExists(conn, "House Care Live$Sales Cr_Memo Header", request.ClosingCreditMemoNo, fromDate, toDate))
                                return BadRequest(new { message = $"Closing Credit Memo No '{request.ClosingCreditMemoNo}' not found between {fromDate:yyyy-MM-dd} and {toDate:yyyy-MM-dd}." });
                        }
                    }
                }

                return Ok(new { message = "Verification successful." });
            }
            catch (SqlException ex)
            {
                return BadRequest(new { message = $"Database Connection Error: {ex.Message}" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Processing Error: {ex.Message}" });
            }
        }

        private async Task<bool> CheckTableExists(SqlConnection conn, string tableName)
        {
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT COUNT(*) FROM sys.tables WHERE name = @TableName";
                cmd.Parameters.AddWithValue("@TableName", tableName);
                var count = (int)await cmd.ExecuteScalarAsync();
                return count > 0;
            }
        }

        private async Task<bool> DocumentExists(SqlConnection conn, string tableName, string documentNo, DateTime fromDate, DateTime toDate)
        {
            using (var cmd = conn.CreateCommand())
            {
                // Dynamic table name requires direct injection but it is hardcoded above, so it is safe.
                cmd.CommandText = $"SELECT COUNT(*) FROM [dbo].[{tableName}] WHERE [No_] = @DocNo AND CAST([Posting Date] AS DATE) BETWEEN @From AND @To";
                cmd.Parameters.AddWithValue("@DocNo", documentNo.Trim());
                cmd.Parameters.AddWithValue("@From", fromDate);
                cmd.Parameters.AddWithValue("@To", toDate);
                var count = (int)await cmd.ExecuteScalarAsync();
                return count > 0;
            }
        }

        public class CashierCloseSalesRequest
        {
            public string EmployeeNo { get; set; }
            public DateTime ClosingDate { get; set; }
            public string LocationCode { get; set; }
            public string StartingInvoiceNo { get; set; }
            public string ClosingInvoiceNo { get; set; }
            public string StartingCreditMemoNo { get; set; }
            public string ClosingCreditMemoNo { get; set; }
            public decimal TotalBankPOS { get; set; }
            public decimal TotalBankTransfer { get; set; }
            public decimal TotalCash { get; set; }
            public decimal TotalPendingCash { get; set; }
            public string CreatedBy { get; set; }
            
            public List<CashierClosingDenominationDto> Denominations { get; set; } = new List<CashierClosingDenominationDto>();
            public List<CashierClosingPendingDto> PendingCash { get; set; } = new List<CashierClosingPendingDto>();
        }

        public class CashierClosingDenominationDto
        {
            public string Denomination { get; set; }
            public int Quantity { get; set; }
            public decimal LineTotal { get; set; }
        }

        public class CashierClosingPendingDto
        {
            public string EmpId { get; set; }
            public string EmpName { get; set; }
            public string CustomerComments { get; set; }
            public decimal Amount { get; set; }
        }

        [HttpPost("CloseSales")]
        public async Task<ActionResult> CloseSales([FromBody] CashierCloseSalesRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.LocationCode)) return BadRequest(new { message = "Invalid request." });

            var location = await _context.Locations.FirstOrDefaultAsync(l => l.LocationCode == request.LocationCode);
            if (location == null) return NotFound(new { message = "Location not found." });

            // Check if Starting Invoice has already been closed in any statement
            if (!string.IsNullOrEmpty(request.StartingInvoiceNo))
            {
                var existingDoc = await _context.CashierClosingDocuments
                    .Include(d => d.CashierClosing)
                    .FirstOrDefaultAsync(d => d.DocumentNo == request.StartingInvoiceNo.Trim() && d.DocumentType == "Invoice");
                if (existingDoc != null)
                {
                    return BadRequest(new { message = $"Starting Invoice '{request.StartingInvoiceNo}' has already been closed in statement #{existingDoc.CashierClosingId}." });
                }
            }

            // Check if Starting Credit Memo has already been closed
            if (!string.IsNullOrEmpty(request.StartingCreditMemoNo))
            {
                var existingDoc = await _context.CashierClosingDocuments
                    .Include(d => d.CashierClosing)
                    .FirstOrDefaultAsync(d => d.DocumentNo == request.StartingCreditMemoNo.Trim() && d.DocumentType == "CrMemo");
                if (existingDoc != null)
                {
                    return BadRequest(new { message = $"Starting Credit Memo '{request.StartingCreditMemoNo}' has already been closed in statement #{existingDoc.CashierClosingId}." });
                }
            }

            string plainPassword = string.IsNullOrEmpty(location.Password) ? "" : EncryptionHelper.Decrypt(location.Password);
            var connStr = $"Server={location.IPAddress};Database={location.DbName};User Id={location.Username};Password={plainPassword};TrustServerCertificate=True;Connect Timeout=15;";

            var closing = new CashierClosing
            {
                EmployeeNo = request.EmployeeNo,
                ClosingDate = request.ClosingDate,
                LocationCode = request.LocationCode,
                StartingInvoiceNo = request.StartingInvoiceNo,
                ClosingInvoiceNo = request.ClosingInvoiceNo,
                StartingCreditMemoNo = request.StartingCreditMemoNo,
                ClosingCreditMemoNo = request.ClosingCreditMemoNo,
                TotalBankPOS = request.TotalBankPOS,
                TotalBankTransfer = request.TotalBankTransfer,
                TotalBank = request.TotalBankPOS + request.TotalBankTransfer,
                TotalCash = request.TotalCash,
                TotalPendingCash = request.TotalPendingCash,
                CreatedBy = request.CreatedBy
            };

            foreach (var d in request.Denominations)
            {
                closing.Denominations.Add(new CashierClosingDenomination { Denomination = d.Denomination, Quantity = d.Quantity, LineTotal = d.LineTotal });
            }
            foreach (var p in request.PendingCash)
            {
                closing.PendingCash.Add(new CashierClosingPending { EmpId = p.EmpId, EmpName = p.EmpName, CustomerComments = p.CustomerComments, Amount = p.Amount });
            }

            decimal systemSalesAmount = 0;
            decimal systemReturnAmount = 0;

            try
            {
                using (var conn = new SqlConnection(connStr))
                {
                    await conn.OpenAsync();
                    bool invoiceTableExists = await CheckTableExists(conn, "House Care Live$Sales Invoice Header");
                    bool creditMemoTableExists = await CheckTableExists(conn, "House Care Live$Sales Cr_Memo Header");

                    if (invoiceTableExists && (!string.IsNullOrEmpty(request.StartingInvoiceNo) || !string.IsNullOrEmpty(request.ClosingInvoiceNo)))
                    {
                        string startInv = string.IsNullOrEmpty(request.StartingInvoiceNo) ? request.ClosingInvoiceNo.Trim() : request.StartingInvoiceNo.Trim();
                        string endInv = string.IsNullOrEmpty(request.ClosingInvoiceNo) ? request.StartingInvoiceNo.Trim() : request.ClosingInvoiceNo.Trim();

                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = @"
                                SELECT H.[No_], H.[Bill-to Customer No_], H.[Posting Date], 
                                       COALESCE((SELECT SUM(L.[Amount Including VAT]) 
                                                 FROM [dbo].[House Care Live$Sales Invoice Line] L 
                                                 WHERE L.[Document No_] = H.[No_]), 0) AS [Amount]
                                FROM [dbo].[House Care Live$Sales Invoice Header] H 
                                WHERE H.[No_] BETWEEN @Start AND @End";
                            
                            cmd.Parameters.AddWithValue("@Start", startInv);
                            cmd.Parameters.AddWithValue("@End", endInv);

                            using (var reader = await cmd.ExecuteReaderAsync())
                            {
                                while (await reader.ReadAsync())
                                {
                                    string docNo = reader.GetString(0);
                                    if (!await _context.CashierClosingDocuments.AnyAsync(d => d.DocumentNo == docNo && d.DocumentType == "Invoice"))
                                    {
                                        decimal amount = reader.IsDBNull(3) ? 0 : reader.GetDecimal(3);
                                        systemSalesAmount += amount;
                                        closing.Documents.Add(new CashierClosingDocument
                                        {
                                            DocumentType = "Invoice",
                                            DocumentNo = docNo,
                                            CustomerNo = reader.IsDBNull(1) ? "" : reader.GetString(1),
                                            AmountIncVAT = amount,
                                            PostingDate = reader.IsDBNull(2) ? DateTime.MinValue : reader.GetDateTime(2)
                                        });
                                    }
                                }
                            }
                        }
                    }

                    if (creditMemoTableExists && (!string.IsNullOrEmpty(request.StartingCreditMemoNo) || !string.IsNullOrEmpty(request.ClosingCreditMemoNo)))
                    {
                        string startCr = string.IsNullOrEmpty(request.StartingCreditMemoNo) ? request.ClosingCreditMemoNo.Trim() : request.StartingCreditMemoNo.Trim();
                        string endCr = string.IsNullOrEmpty(request.ClosingCreditMemoNo) ? request.StartingCreditMemoNo.Trim() : request.ClosingCreditMemoNo.Trim();

                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = @"
                                SELECT H.[No_], H.[Bill-to Customer No_], H.[Posting Date], 
                                       COALESCE((SELECT SUM(L.[Amount Including VAT]) 
                                                 FROM [dbo].[House Care Live$Sales Cr_Memo Line] L 
                                                 WHERE L.[Document No_] = H.[No_]), 0) AS [Amount]
                                FROM [dbo].[House Care Live$Sales Cr_Memo Header] H 
                                WHERE H.[No_] BETWEEN @Start AND @End";
                            
                            cmd.Parameters.AddWithValue("@Start", startCr);
                            cmd.Parameters.AddWithValue("@End", endCr);

                            using (var reader = await cmd.ExecuteReaderAsync())
                            {
                                while (await reader.ReadAsync())
                                {
                                    string docNo = reader.GetString(0);
                                    if (!await _context.CashierClosingDocuments.AnyAsync(d => d.DocumentNo == docNo && d.DocumentType == "CrMemo"))
                                    {
                                        decimal amount = reader.IsDBNull(3) ? 0 : reader.GetDecimal(3);
                                        systemReturnAmount += amount;
                                        closing.Documents.Add(new CashierClosingDocument
                                        {
                                            DocumentType = "CrMemo",
                                            DocumentNo = docNo,
                                            CustomerNo = reader.IsDBNull(1) ? "" : reader.GetString(1),
                                            AmountIncVAT = amount,
                                            PostingDate = reader.IsDBNull(2) ? DateTime.MinValue : reader.GetDateTime(2)
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Failed to fetch external documents: {ex.Message}" });
            }

            closing.SystemSalesAmount = systemSalesAmount;
            closing.SystemReturnAmount = systemReturnAmount;
            decimal totalReceived = closing.TotalBank + closing.TotalCash + closing.TotalPendingCash;
            closing.Difference = (systemSalesAmount - systemReturnAmount) - totalReceived;

            _context.CashierClosings.Add(closing);
            await _context.SaveChangesAsync();

            return Ok(new { 
                message = "Sales Closed Successfully", 
                id = closing.Id,
                systemSales = systemSalesAmount - systemReturnAmount,
                difference = closing.Difference
            });
        }

        // GET: api/CashierClosing
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetStatements()
        {
            var statements = await _context.CashierClosings
                .Select(c => new {
                    c.Id,
                    c.CreatedAt,
                    c.EmployeeNo,
                    c.LocationCode,
                    EmployeeName = _context.Employees
                        .Where(e => e.EmpId == c.EmployeeNo)
                        .Select(e => e.ArabicName ?? e.EnglishName)
                        .FirstOrDefault()
                })
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync();

            return Ok(statements);
        }

        // GET: api/CashierClosing/{id}
        [HttpGet("{id}")]
        public async Task<ActionResult> GetStatement(int id)
        {
            var statement = await _context.CashierClosings
                .Include(c => c.Denominations)
                .Include(c => c.PendingCash)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (statement == null)
            {
                return NotFound(new { message = $"Statement #{id} not found." });
            }

            return Ok(statement);
        }
    }
}
