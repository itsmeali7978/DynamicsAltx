using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Data.SqlClient;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BiddingController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public BiddingController(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // POST: api/Bidding/CreateBid
        [HttpPost("CreateBid")]
        public async Task<ActionResult<BidHeader>> CreateBid(BidCreateDto dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Generate BidNo
                string bidNo = await GenerateBidNo();

                // 2. Create Header
                var header = new BidHeader
                {
                    BidNo = bidNo,
                    CreatedDate = DateTime.Now.Date,
                    Status = "Active"
                };
                _context.BidHeaders.Add(header);
                await _context.SaveChangesAsync();

                // 3. Create Lines
                foreach (var lineDto in dto.Lines)
                {
                    var line = new BidLine
                    {
                        BidHNo = bidNo,
                        NAVDocNo = lineDto.NAVDocNo,
                        NAVSku = lineDto.NAVSku,
                        UOM = lineDto.UOM,
                        Quantity = lineDto.Quantity
                    };
                    _context.BidLines.Add(line);
                    await _context.SaveChangesAsync(); // Save to get LineId for prices

                    // 4. Create Prices
                    foreach (var priceDto in lineDto.Prices)
                    {
                        var price = new VendorSubPrice
                        {
                            BidLineId = line.Id,
                            VendorId = priceDto.VendorId,
                            Cost = priceDto.Cost
                        };
                        _context.VendorSubPrices.Add(price);
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(header);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/Bidding/Bids
        [HttpGet("Bids")]
        public async Task<ActionResult<IEnumerable<BidHeader>>> GetBids()
        {
            return await _context.BidHeaders
                .Where(b => b.Status == "Active")
                .OrderByDescending(b => b.BidNo)
                .ToListAsync();
        }

        // POST: api/Bidding/UpdateBidStatus
        [HttpPost("UpdateBidStatus")]
        public async Task<ActionResult> UpdateBidStatus([FromBody] UpdateStatusDto dto)
        {
            var header = await _context.BidHeaders.FirstOrDefaultAsync(b => b.BidNo == dto.BidNo);
            if (header == null) return NotFound();

            header.Status = dto.NewStatus;
            _context.BidHeaders.Update(header);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Bid status updated to {dto.NewStatus}" });
        }

        // GET: api/Bidding/BidDetails/{bidNo}
        [HttpGet("BidDetails/{bidNo}")]
        public async Task<ActionResult> GetBidDetails(string bidNo)
        {
            var header = await _context.BidHeaders.FirstOrDefaultAsync(b => b.BidNo == bidNo);
            if (header == null) return NotFound();

            var lines = await _context.BidLines
                .Include(l => l.Prices)
                .Where(l => l.BidHNo == bidNo)
                .ToListAsync();

            var vendors = await _context.VendorSubs.ToListAsync();

            return Ok(new { header, lines, vendors });
        }

        // POST: api/Bidding/InitializeBid
        [HttpPost("InitializeBid")]
        public async Task<ActionResult<BidHeader>> InitializeBid()
        {
            string bidNo = await GenerateBidNo();
            var header = new BidHeader
            {
                BidNo = bidNo,
                CreatedDate = DateTime.Now.Date,
                Status = "Active"
            };

            _context.BidHeaders.Add(header);
            await _context.SaveChangesAsync();
            return Ok(header);
        }

        // POST: api/Bidding/FetchAndSyncLines
        [HttpPost("FetchAndSyncLines")]
        public async Task<ActionResult> FetchAndSyncLines([FromBody] FetchRequestDto dto)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Fetch from Navision Table using dedicated connection string
                var navLines = new List<NavLineDto>();
                var navConnectionString = _configuration.GetConnectionString("NavisionConnection");

                using (var navConnection = new SqlConnection(navConnectionString))
                {
                    await navConnection.OpenAsync();
                    using (var command = navConnection.CreateCommand())
                    {
                        var docIds = dto.NavDocNo.Split('|', StringSplitOptions.RemoveEmptyEntries)
                                                 .Select(id => id.Trim())
                                                 .ToList();

                        if (!docIds.Any())
                        {
                            return BadRequest(new { message = "No valid document numbers provided" });
                        }

                        var parameterNames = docIds.Select((id, index) => $"@docNo{index}").ToList();
                        string inClause = string.Join(", ", parameterNames);

                        command.CommandText = $@"
                            SELECT [Item No_], [Quantity], [Unit of Measure], [Description], [Document No_]
                            FROM [dbo].[House Care Live$InStore Stock Req_ Line] 
                            WHERE [Document No_] IN ({inClause})";
                        
                        for (int i = 0; i < docIds.Count; i++)
                        {
                            command.Parameters.AddWithValue($"@docNo{i}", docIds[i]);
                        }

                        using (var reader = await command.ExecuteReaderAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                navLines.Add(new NavLineDto
                                {
                                    ItemNo = reader.IsDBNull(0) ? "" : reader.GetString(0),
                                    Quantity = reader.IsDBNull(1) ? 0 : reader.GetDecimal(1),
                                    UOM = reader.IsDBNull(2) ? "" : reader.GetString(2),
                                    Description = reader.IsDBNull(3) ? "" : reader.GetString(3),
                                    DocumentNo = reader.IsDBNull(4) ? "" : reader.GetString(4)
                                });
                            }
                        }
                    }
                }

                if (!navLines.Any())
                {
                    return NotFound(new { message = $"No records found in Navision for Document Nos: {dto.NavDocNo}" });
                }

                // 2. Delete existing BidLines and their VendorSubPrices for this bid
                var existingBidLines = await _context.BidLines
                    .Where(l => l.BidHNo == dto.BidNo)
                    .ToListAsync();

                if (existingBidLines.Any())
                {
                    var existingLineIds = existingBidLines.Select(l => l.Id).ToList();

                    // Delete VendorSubPrices first (child records)
                    var existingVendorPrices = await _context.VendorSubPrices
                        .Where(v => existingLineIds.Contains(v.BidLineId))
                        .ToListAsync();
                    _context.VendorSubPrices.RemoveRange(existingVendorPrices);

                    // Delete the BidLines
                    _context.BidLines.RemoveRange(existingBidLines);
                    await _context.SaveChangesAsync();
                }

                // 3. Insert fresh records from Navision
                var existingVendors = await _context.VendorSubs.ToListAsync();

                foreach (var navLine in navLines)
                {
                    // Robust SKU Extraction: Get only numeric digits from ItemNo
                    string numericPart = new string(navLine.ItemNo.Where(char.IsDigit).ToArray());
                    
                    if (string.IsNullOrEmpty(numericPart)) continue;
                    if (!int.TryParse(numericPart, out int skuInt)) continue;

                    var newLine = new BidLine
                    {
                        BidHNo = dto.BidNo,
                        NAVDocNo = navLine.DocumentNo,
                        NAVSku = skuInt,
                        UOM = navLine.UOM,
                        Quantity = navLine.Quantity,
                        Description = navLine.Description
                    };
                    _context.BidLines.Add(newLine);
                    await _context.SaveChangesAsync(); // Get ID for VendorSubPrices

                    // Initialize VendorSubPrices for ALL vendors
                    foreach (var vendor in existingVendors)
                    {
                        _context.VendorSubPrices.Add(new VendorSubPrice
                        {
                            BidLineId = newLine.Id,
                            VendorId = vendor.Id,
                            Cost = 0
                        });
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var updatedLines = await _context.BidLines
                    .Include(l => l.Prices)
                    .Where(l => l.BidHNo == dto.BidNo)
                    .ToListAsync();

                var allVendors = await _context.VendorSubs.ToListAsync();

                return Ok(new { lines = updatedLines, vendors = allVendors });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST: api/Bidding/UpdateVendorPrice
        [HttpPost("UpdateVendorPrice")]
        public async Task<ActionResult> UpdateVendorPrice([FromBody] UpdatePriceDto dto)
        {
            var price = await _context.VendorSubPrices
                .FirstOrDefaultAsync(p => p.BidLineId == dto.BidLineId && p.VendorId == dto.VendorId);

            if (price == null)
            {
                // If for some reason it doesn't exist, create it
                price = new VendorSubPrice
                {
                    BidLineId = dto.BidLineId,
                    VendorId = dto.VendorId,
                    Cost = dto.NewCost
                };
                _context.VendorSubPrices.Add(price);
            }
            else
            {
                price.Cost = dto.NewCost;
                _context.VendorSubPrices.Update(price);
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Price updated successfully" });
        }

        private async Task<string> GenerateBidNo()
        {
            var lastBid = await _context.BidHeaders
                .OrderByDescending(b => b.BidNo)
                .FirstOrDefaultAsync();

            if (lastBid == null)
            {
                return "BDREQ-100";
            }

            string currentNoStr = lastBid.BidNo.Replace("BDREQ-", "");
            if (int.TryParse(currentNoStr, out int currentNo))
            {
                return $"BDREQ-{currentNo + 1}";
            }

            return "BDREQ-100";
        }
    }

    public class BidCreateDto
    {
        public List<BidLineDto> Lines { get; set; }
    }

    public class BidLineDto
    {
        public string NAVDocNo { get; set; }
        public int NAVSku { get; set; }
        public string UOM { get; set; }
        public decimal Quantity { get; set; }
        public List<VendorPriceDto> Prices { get; set; }
    }

    public class VendorPriceDto
    {
        public int VendorId { get; set; }
        public decimal Cost { get; set; }
    }

    public class UpdatePriceDto
    {
        public int BidLineId { get; set; }
        public int VendorId { get; set; }
        public decimal NewCost { get; set; }
    }

    public class UpdateStatusDto
    {
        public string BidNo { get; set; }
        public string NewStatus { get; set; }
    }

    public class FetchRequestDto
    {
        public string BidNo { get; set; }
        public string NavDocNo { get; set; }
    }

    public class NavLineDto
    {
        public string ItemNo { get; set; }
        public decimal Quantity { get; set; }
        public string UOM { get; set; }
        public string Description { get; set; }
        public string DocumentNo { get; set; }
    }
}
