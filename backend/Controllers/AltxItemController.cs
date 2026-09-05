using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers
{
    public class AltxItemSyncRequest
    {
        public string? Brand { get; set; }
        public string? VendorNo { get; set; }
        public string? ProductPostingGroup { get; set; }
        public string? ShelfClass { get; set; }
    }

    [Route("api/[controller]")]
    [ApiController]
    public class AltxItemController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AltxItemController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // GET: api/AltxItem
        [HttpGet]
        public async Task<ActionResult> GetItems([FromQuery] int limit = 200)
        {
            try
            {
                var takeLimit = limit > 0 ? limit : 200;
                var items = await _context.AltxItems
                    .OrderByDescending(i => i.ItemNo)
                    .Take(takeLimit)
                    .ToListAsync();

                return Ok(items);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Error retrieving local items: {ex.Message}" });
            }
        }

        // POST: api/AltxItem/sync
        [HttpPost("sync")]
        public async Task<ActionResult> SyncNavisionItems([FromBody] AltxItemSyncRequest request)
        {
            try
            {
                // 1. Fetch existing item numbers from local AltxItems table for deduplication
                var existingItemNos = (await _context.AltxItems.Select(i => i.ItemNo).ToListAsync()).ToHashSet();

                // 2. Build dynamic SQL query for Navision Item table based on non-empty filters
                var navConnectionString = _configuration.GetConnectionString("NavisionConnection");
                if (string.IsNullOrEmpty(navConnectionString))
                {
                    return BadRequest(new { message = "Navision database connection string is not configured." });
                }

                var sqlBuilder = new System.Text.StringBuilder();
                sqlBuilder.Append(@"
                    SELECT 
                        [No_], 
                        [Description], 
                        [Description 2], 
                        [Brand], 
                        [Vendor No_], 
                        [Shelf Class], 
                        [Gen_ Prod_ Posting Group]
                    FROM [dbo].[House Care Live$Item]
                    WHERE 1=1 ");

                var parameters = new List<SqlParameter>();

                if (!string.IsNullOrWhiteSpace(request.Brand))
                {
                    var brandVal = request.Brand.Trim();
                    sqlBuilder.Append(" AND (LOWER(RTRIM(LTRIM([Brand]))) = LOWER(@Brand) OR LOWER(RTRIM(LTRIM([Brand]))) LIKE LOWER(@BrandLike))");
                    parameters.Add(new SqlParameter("@Brand", brandVal));
                    parameters.Add(new SqlParameter("@BrandLike", "%" + brandVal + "%"));
                }

                if (!string.IsNullOrWhiteSpace(request.VendorNo))
                {
                    var vendorVal = request.VendorNo.Trim();
                    sqlBuilder.Append(" AND (LOWER(RTRIM(LTRIM([Vendor No_]))) = LOWER(@VendorNo) OR LOWER(RTRIM(LTRIM([Vendor No_]))) LIKE LOWER(@VendorNoLike))");
                    parameters.Add(new SqlParameter("@VendorNo", vendorVal));
                    parameters.Add(new SqlParameter("@VendorNoLike", "%" + vendorVal + "%"));
                }

                if (!string.IsNullOrWhiteSpace(request.ProductPostingGroup))
                {
                    var prodGroupVal = request.ProductPostingGroup.Trim();
                    sqlBuilder.Append(" AND (LOWER(RTRIM(LTRIM([Gen_ Prod_ Posting Group]))) = LOWER(@ProductPostingGroup) OR LOWER(RTRIM(LTRIM([Gen_ Prod_ Posting Group]))) LIKE LOWER(@ProductPostingGroupLike))");
                    parameters.Add(new SqlParameter("@ProductPostingGroup", prodGroupVal));
                    parameters.Add(new SqlParameter("@ProductPostingGroupLike", "%" + prodGroupVal + "%"));
                }

                if (!string.IsNullOrWhiteSpace(request.ShelfClass))
                {
                    var shelfVal = request.ShelfClass.Trim();
                    sqlBuilder.Append(" AND (LOWER(RTRIM(LTRIM([Shelf Class]))) = LOWER(@ShelfClass) OR LOWER(RTRIM(LTRIM([Shelf Class]))) LIKE LOWER(@ShelfClassLike))");
                    parameters.Add(new SqlParameter("@ShelfClass", shelfVal));
                    parameters.Add(new SqlParameter("@ShelfClassLike", "%" + shelfVal + "%"));
                }

                var existingItemsMap = await _context.AltxItems.ToDictionaryAsync(i => i.ItemNo);
                var newItems = new List<AltxItem>();
                int totalFetched = 0;
                int updatedCount = 0;
                int insertedCount = 0;
                int skippedInvalidNoCount = 0;

                using (var conn = new SqlConnection(navConnectionString))
                {
                    await conn.OpenAsync();
                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandText = sqlBuilder.ToString();
                        cmd.Parameters.AddRange(parameters.ToArray());

                        using (var reader = await cmd.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                totalFetched++;

                                var rawNo = reader.IsDBNull(0) ? "" : reader.GetValue(0)?.ToString()?.Trim() ?? "";
                                if (!int.TryParse(rawNo, out int itemNo))
                                {
                                    skippedInvalidNoCount++;
                                    continue;
                                }

                                // MAPPING PER USER SPECIFICATION:
                                // ItemNo       = [No_]
                                // DescAra      = [Description]
                                // DescEng      = [Description 2]
                                // Brand        = [Brand]
                                // VendorNo     = [Vendor No_]
                                // ShelfClass   = [Shelf Class]
                                // ALtxDivision = [Gen_ Prod_ Posting Group]
                                var descAra = reader.IsDBNull(1) ? "" : reader.GetValue(1)?.ToString()?.Trim() ?? "";
                                var descEng = reader.IsDBNull(2) ? "" : reader.GetValue(2)?.ToString()?.Trim() ?? "";
                                var brand = reader.IsDBNull(3) ? "" : reader.GetValue(3)?.ToString()?.Trim() ?? "";
                                var vendorNo = reader.IsDBNull(4) ? "" : reader.GetValue(4)?.ToString()?.Trim() ?? "";
                                var shelfClass = reader.IsDBNull(5) ? "" : reader.GetValue(5)?.ToString()?.Trim() ?? "";
                                var altxDivision = reader.IsDBNull(6) ? "" : reader.GetValue(6)?.ToString()?.Trim() ?? "";

                                if (existingItemsMap.TryGetValue(itemNo, out var existingItem))
                                {
                                    existingItem.DescEng = descEng;
                                    existingItem.DescAra = descAra;
                                    existingItem.Brand = brand;
                                    existingItem.VendorNo = vendorNo;
                                    existingItem.ShelfClass = shelfClass;
                                    existingItem.ALtxDivision = altxDivision;
                                    updatedCount++;
                                }
                                else
                                {
                                    var newItem = new AltxItem
                                    {
                                        ItemNo = itemNo,
                                        DescEng = descEng,
                                        DescAra = descAra,
                                        Brand = brand,
                                        VendorNo = vendorNo,
                                        ShelfClass = shelfClass,
                                        ALtxDivision = altxDivision,
                                        Status = true
                                    };
                                    newItems.Add(newItem);
                                    existingItemsMap[itemNo] = newItem;
                                    insertedCount++;
                                }
                            }
                        }
                    }
                }

                // Batch insert new items into local AltxItems table
                if (newItems.Count > 0)
                {
                    const int batchSize = 500;
                    for (int i = 0; i < newItems.Count; i += batchSize)
                    {
                        var batch = newItems.Skip(i).Take(batchSize).ToList();
                        _context.AltxItems.AddRange(batch);
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = $"Sync complete. Processed {totalFetched} item(s) from Navision. Inserted {insertedCount} new item(s), updated {updatedCount} existing item(s).",
                    totalFetched,
                    insertedCount,
                    updatedCount,
                    skippedInvalidNoCount
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Sync failed: {ex.Message}" });
            }
        }
    }
}
