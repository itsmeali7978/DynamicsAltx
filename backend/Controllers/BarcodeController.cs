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

                    return Ok(new
                    {
                        ItemNo = itemNo,
                        DescriptionArabic = descAr,
                        DescriptionEnglish = descEn,
                        DefaultUom = uomCode,
                        UnitsOfMeasure = uoms
                    });
                }
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error: {ex.Message}" });
            }
        }

        // GET: api/Barcode/barcodes?itemNo={itemNo}&uom={uom}&userEmail={userEmail}
        [HttpGet("barcodes")]
        public async Task<ActionResult> GetBarcodes(string itemNo, string uom, string userEmail)
        {
            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
                var location = await _context.Locations.FirstOrDefaultAsync(l => l.LocationCode == user.Location);
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
                return BadRequest(new { message = $"Error: {ex.Message}" });
            }
        }
    }
}
