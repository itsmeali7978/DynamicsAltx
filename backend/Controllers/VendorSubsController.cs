using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Backend.Data;
using Backend.Models;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VendorSubsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public VendorSubsController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/VendorSubs
        [HttpPost]
        public async Task<ActionResult<VendorSub>> CreateVendorSub(VendorSub vendorSub)
        {
            try
            {
                _context.VendorSubs.Add(vendorSub);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Vendor created successfully", vendor = vendorSub });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // GET: api/VendorSubs
        [HttpGet]
        public async Task<ActionResult<IEnumerable<VendorSub>>> GetVendorSubs()
        {
            return await _context.VendorSubs.ToListAsync();
        }

        // DELETE: api/VendorSubs/{id}
        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteVendorSub(int id)
        {
            var vendor = await _context.VendorSubs.FindAsync(id);
            if (vendor == null)
                return NotFound(new { message = "Vendor not found" });

            // Count how many bid price entries will be deleted
            var priceCount = await _context.VendorSubPrices
                .CountAsync(p => p.VendorId == id);

            // Delete all VendorSubPrices for this vendor first
            var prices = await _context.VendorSubPrices
                .Where(p => p.VendorId == id)
                .ToListAsync();
            _context.VendorSubPrices.RemoveRange(prices);

            // Delete the vendor
            _context.VendorSubs.Remove(vendor);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Vendor deleted. {priceCount} bid price entries also removed." });
        }
    }
}
