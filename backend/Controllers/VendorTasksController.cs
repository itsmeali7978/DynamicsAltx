using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VendorTasksController : ControllerBase
    {
        private readonly AppDbContext _context;

        public VendorTasksController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/VendorTasks
        [HttpGet]
        public async Task<ActionResult<IEnumerable<VendorTask>>> GetVendorTasks()
        {
            return await _context.VendorTasks.ToListAsync();
        }

        // GET: api/VendorTasks/5
        [HttpGet("{id}")]
        public async Task<ActionResult<VendorTask>> GetVendorTask(int id)
        {
            var vendorTask = await _context.VendorTasks.FindAsync(id);

            if (vendorTask == null)
            {
                return NotFound();
            }

            return vendorTask;
        }

        // POST: api/VendorTasks
        [HttpPost]
        public async Task<ActionResult<VendorTask>> PostVendorTask(VendorTask vendorTask)
        {
            _context.VendorTasks.Add(vendorTask);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetVendorTask), new { id = vendorTask.Id }, vendorTask);
        }

        // PUT: api/VendorTasks/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutVendorTask(int id, VendorTask vendorTask)
        {
            if (id != vendorTask.Id)
            {
                return BadRequest();
            }

            _context.Entry(vendorTask).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!VendorTaskExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // DELETE: api/VendorTasks/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteVendorTask(int id)
        {
            var vendorTask = await _context.VendorTasks.FindAsync(id);
            if (vendorTask == null)
            {
                return NotFound();
            }

            _context.VendorTasks.Remove(vendorTask);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool VendorTaskExists(int id)
        {
            return _context.VendorTasks.Any(e => e.Id == id);
        }
    }
}
