using Backend.Data;
using Backend.Helpers;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using System.Collections.Generic;
using System.Data;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BarcodeController : ControllerBase
    {
        private readonly AppDbContext _context;

        public BarcodeController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Barcode/lookup?input={input}&userEmail={userEmail}
        [HttpGet("lookup")]
        public async Task<ActionResult> GetLookup(string input, string userEmail)
        {
            if (string.IsNullOrEmpty(input) || string.IsNullOrEmpty(userEmail))
            {
                return BadRequest(new { message = "Input and User Email are required." });
            }

            try
            {
                // 1. Get User and Location
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
                if (user == null) return NotFound(new { message = "User not found." });

                var location = await _context.Locations.FirstOrDefaultAsync(l => l.LocationCode == user.Location);
                if (location == null) return NotFound(new { message = $"Location configuration for '{user.Location}' not found." });

                // 2. Build Connection String
                string plainPassword = EncryptionHelper.Decrypt(location.Password);
                var connStr = $"Server={location.IPAddress};Database={location.DbName};User Id={location.Username};Password={plainPassword};TrustServerCertificate=True;Connect Timeout=30;";

                using (var conn = new SqlConnection(connStr))
                {
                    await conn.OpenAsync();

                    string itemNo = null;
                    string uomCode = null;

                    // --- LOGIC 1: Search in Barcodes Table ---
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT TOP 1 [Item No_], [Unit of Measure Code] FROM [dbo].[House Care Live$Barcodes] WHERE [Barcode No_] = @input";
                        cmd.Parameters.AddWithValue("@input", input);
                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                itemNo = reader.GetString(0);
                                uomCode = reader.GetString(1);
                            }
                        }
                    }

                    // --- LOGIC 2: If not found, search in Item Table ---
                    if (string.IsNullOrEmpty(itemNo))
                    {
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandText = "SELECT TOP 1 [No_] FROM [dbo].[House Care Live$Item] WHERE [No_] = @input";
                            cmd.Parameters.AddWithValue("@input", input);
                            itemNo = (string)await cmd.ExecuteScalarAsync();
                        }
                    }

                    if (string.IsNullOrEmpty(itemNo))
                    {
                        return NotFound(new { message = "Item or Barcode not found." });
                    }

                    // 3. Fetch Item Details (Descriptions)
                    string descAr = "", descEn = "";
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT [Description], [Description 2] FROM [dbo].[House Care Live$Item] WHERE [No_] = @itemNo";
                        cmd.Parameters.AddWithValue("@itemNo", itemNo);
                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            if (await reader.ReadAsync())
                            {
                                descAr = reader.IsDBNull(0) ? "" : reader.GetString(0);
                                descEn = reader.IsDBNull(1) ? "" : reader.GetString(1);
                            }
                        }
                    }

                    // 4. Fetch All Units of Measure for this item
                    var uoms = new List<string>();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = "SELECT [Code] FROM [dbo].[House Care Live$Item Unit of Measure] WHERE [Item No_] = @itemNo";
                        cmd.Parameters.AddWithValue("@itemNo", itemNo);
                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                uoms.Add(reader.GetString(0));
                            }
                        }
                    }

                    // If uomCode was not found (Logic 2), use the first one available or null
                    if (string.IsNullOrEmpty(uomCode) && uoms.Count > 0)
                    {
                        uomCode = uoms[0];
                    }

                    // 5. Fetch Sales Price for item, default UOM, and user location
                    decimal regPrice = await GetSalesPriceAsync(conn, itemNo, uomCode, user.Location);

                    return Ok(new
                    {
                        ItemNo = itemNo,
                        DescriptionArabic = descAr,
                        DescriptionEnglish = descEn,
                        DefaultUom = uomCode,
                        UnitsOfMeasure = uoms,
                        RegularPrice = regPrice
                    });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error: {ex.Message}" });
            }
        }

        // GET: api/Barcode/price?itemNo={itemNo}&uom={uom}&userEmail={userEmail}
        [HttpGet("price")]
        public async Task<ActionResult> GetPrice(string itemNo, string uom, string userEmail)
        {
            if (string.IsNullOrEmpty(itemNo) || string.IsNullOrEmpty(userEmail))
            {
                return BadRequest(new { message = "ItemNo and UserEmail are required." });
            }

            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
                if (user == null) return NotFound(new { message = "User not found." });

                var location = await _context.Locations.FirstOrDefaultAsync(l => l.LocationCode == user.Location);
                if (location == null) return NotFound(new { message = $"Location configuration for '{user.Location}' not found." });

                string plainPassword = EncryptionHelper.Decrypt(location.Password);
                var connStr = $"Server={location.IPAddress};Database={location.DbName};User Id={location.Username};Password={plainPassword};TrustServerCertificate=True;Connect Timeout=30;";

                using (var conn = new SqlConnection(connStr))
                {
                    await conn.OpenAsync();
                    decimal price = await GetSalesPriceAsync(conn, itemNo, uom, user.Location);
                    return Ok(new { itemNo, uom, price });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error: {ex.Message}" });
            }
        }

        // Helper to fetch latest Unit Price Including VAT from Sales Price or Item table
        private async Task<decimal> GetSalesPriceAsync(SqlConnection conn, string itemNo, string uom, string salesCode)
        {
            try
            {
                using (var cmd = conn.CreateCommand())
                {
                    // Level 1: Match Sales Price with ItemNo, UOM, and SalesCode
                    cmd.CommandText = @"
                        SELECT TOP 1 COALESCE(NULLIF([Unit Price Including VAT], 0), [Unit Price], 0)
                        FROM [dbo].[House Care Live$Sales Price]
                        WHERE [Item No_] = @itemNo
                          AND [Unit of Measure Code] = @uom
                          AND [Sales Code] = @salesCode
                        ORDER BY [Starting Date] DESC";

                    cmd.Parameters.AddWithValue("@itemNo", itemNo ?? "");
                    cmd.Parameters.AddWithValue("@uom", uom ?? "");
                    cmd.Parameters.AddWithValue("@salesCode", salesCode ?? "");

                    var res1 = await cmd.ExecuteScalarAsync();
                    if (res1 != null && res1 != DBNull.Value && Convert.ToDecimal(res1) > 0)
                    {
                        return Convert.ToDecimal(res1);
                    }

                    // Level 2: Match Sales Price with ItemNo & UOM (blank or any Sales Code)
                    cmd.CommandText = @"
                        SELECT TOP 1 COALESCE(NULLIF([Unit Price Including VAT], 0), [Unit Price], 0)
                        FROM [dbo].[House Care Live$Sales Price]
                        WHERE [Item No_] = @itemNo
                          AND [Unit of Measure Code] = @uom
                        ORDER BY [Starting Date] DESC";

                    var res2 = await cmd.ExecuteScalarAsync();
                    if (res2 != null && res2 != DBNull.Value && Convert.ToDecimal(res2) > 0)
                    {
                        return Convert.ToDecimal(res2);
                    }

                    // Level 3: Match Sales Price with ItemNo & SalesCode (any UOM)
                    cmd.CommandText = @"
                        SELECT TOP 1 COALESCE(NULLIF([Unit Price Including VAT], 0), [Unit Price], 0)
                        FROM [dbo].[House Care Live$Sales Price]
                        WHERE [Item No_] = @itemNo
                          AND [Sales Code] = @salesCode
                        ORDER BY [Starting Date] DESC";

                    var res3 = await cmd.ExecuteScalarAsync();
                    if (res3 != null && res3 != DBNull.Value && Convert.ToDecimal(res3) > 0)
                    {
                        return Convert.ToDecimal(res3);
                    }

                    // Level 4: Match Sales Price with ItemNo (any UOM, any Sales Code)
                    cmd.CommandText = @"
                        SELECT TOP 1 COALESCE(NULLIF([Unit Price Including VAT], 0), [Unit Price], 0)
                        FROM [dbo].[House Care Live$Sales Price]
                        WHERE [Item No_] = @itemNo
                        ORDER BY [Starting Date] DESC";

                    var res4 = await cmd.ExecuteScalarAsync();
                    if (res4 != null && res4 != DBNull.Value && Convert.ToDecimal(res4) > 0)
                    {
                        return Convert.ToDecimal(res4);
                    }

                    // Level 5: Fallback to Item Master Table [Unit Price]
                    cmd.CommandText = @"
                        SELECT TOP 1 [Unit Price]
                        FROM [dbo].[House Care Live$Item]
                        WHERE [No_] = @itemNo";

                    var res5 = await cmd.ExecuteScalarAsync();
                    if (res5 != null && res5 != DBNull.Value && Convert.ToDecimal(res5) > 0)
                    {
                        return Convert.ToDecimal(res5);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[BarcodeController] GetSalesPriceAsync Error: {ex.Message}");
            }
            return 0m;
        }

        // GET: api/Barcode/barcodes?itemNo={itemNo}&uom={uom}&userEmail={userEmail}
        [HttpGet("barcodes")]
        public async Task<ActionResult> GetBarcodes(string itemNo, string uom, string userEmail)
        {
            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
                if (user == null) return BadRequest(new { message = "User not found." });
                var location = await _context.Locations.FirstOrDefaultAsync(l => l.LocationCode == user.Location);
                if (location == null) return BadRequest(new { message = "Location not found." });

                string plainPassword = EncryptionHelper.Decrypt(location.Password);
                var connStr = $"Server={location.IPAddress};Database={location.DbName};User Id={location.Username};Password={plainPassword};TrustServerCertificate=True;";

                var barcodes = new List<object>();

                using (var conn = new SqlConnection(connStr))
                {
                    await conn.OpenAsync();
                    using (var cmd = conn.CreateCommand())
                    {
                        string query = "SELECT [Item No_], [Barcode No_] FROM [dbo].[House Care Live$Barcodes] WHERE [Item No_] = @itemNo";
                        if (!string.IsNullOrEmpty(uom)) query += " AND [Unit of Measure Code] = @uom";
                        
                        cmd.CommandText = query;
                        cmd.Parameters.AddWithValue("@itemNo", itemNo);
                        if (!string.IsNullOrEmpty(uom)) cmd.Parameters.AddWithValue("@uom", uom);

                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                barcodes.Add(new
                                {
                                    ItemNo = reader.GetString(0),
                                    Barcode = reader.GetString(1)
                                });
                            }
                        }
                    }
                }

                return Ok(barcodes);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Barcode/print-shelf-label?userEmail={userEmail}
        [HttpPost("print-shelf-label")]
        public async Task<ActionResult> PrintShelfLabel([FromBody] PrintLabelRequest req, [FromQuery] string userEmail)
        {
            if (req == null || string.IsNullOrEmpty(req.ItemNo))
            {
                return BadRequest(new { message = "Item data is required for printing." });
            }

            if (string.IsNullOrWhiteSpace(userEmail))
            {
                return BadRequest(new { message = "Printer not configured on this machine" });
            }

            // 1. Fetch user to obtain assigned location code
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
            if (user == null || string.IsNullOrWhiteSpace(user.Location))
            {
                return BadRequest(new { message = "Printer not configured on this machine" });
            }

            // 2. Query PrinterSettings table for Type = "Shelf Label" and Location = user.Location
            var setting = await _context.PrinterSettings
                .FirstOrDefaultAsync(p => p.Location == user.Location && p.Type == "Shelf Label");

            if (setting == null || string.IsNullOrWhiteSpace(setting.PrinterName))
            {
                return BadRequest(new { message = "Printer not configured on this machine" });
            }

            string printerName = setting.PrinterName;

            int qty = req.Qty > 0 ? req.Qty : 1;
            string itemDesc = !string.IsNullOrEmpty(req.DescAr) ? req.DescAr : (!string.IsNullOrEmpty(req.DescEn) ? req.DescEn : req.ItemNo);

            // ZPL formatting for 8cm x 3.5cm Shelf Label (PW640, LL280, No Border, Single Page)
            string zpl = $@"^XA
^PW640
^LL280
^CI28
^FO20,8^A0N,48,50^FB600,1,0,C^FDHouseCare^FS
^FO20,50^A0N,100,112^FB600,1,0,C^FDSAR {req.Price:F2}^FS
^FO20,140^A0N,44,46^FB600,2,0,C^FD{itemDesc}^FS
^FO20,230^A0N,38,38^FD{req.ItemNo}^FS
^FO460,230^A0N,38,38^FD({req.Uom})^FS
^PQ{qty}
^XZ";

            // 1. Attempt server-side Windows spooler printing if printer is connected on server machine
            try
            {
                if (RawPrinterHelper.CheckPrinterConnected(printerName))
                {
                    bool serverSuccess = RawPrinterHelper.SendStringToPrinter(printerName, zpl);
                    if (serverSuccess)
                    {
                        return Ok(new { message = $"Successfully printed {qty} Shelf Label(s) to '{printerName}' on server." });
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[BarcodeController] Server spooler attempt exception: {ex.Message}");
            }

            // 2. If printer is on client PC, return clientPrint payload for client-side local printing
            return Ok(new
            {
                clientPrint = true,
                printMethod = string.IsNullOrWhiteSpace(setting.PrintMethod) ? "Zebra Command" : setting.PrintMethod,
                printerName = printerName,
                zpl = zpl,
                qty = qty,
                itemNo = req.ItemNo,
                barcode = string.IsNullOrEmpty(req.Barcode) ? req.ItemNo : req.Barcode,
                desc = itemDesc,
                uom = req.Uom,
                price = req.Price,
                message = $"Dispatching print job to local printer '{printerName}'..."
            });
        }
    }

    public class PrintLabelRequest
    {
        public string ItemNo { get; set; }
        public string Barcode { get; set; }
        public string Uom { get; set; }
        public string DescAr { get; set; }
        public string DescEn { get; set; }
        public decimal Price { get; set; }
        public int Qty { get; set; } = 1;
        public string PrinterName { get; set; } = "ZDesigner GK420t (Copy 2)";
    }
}
