using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class VendorProfileTasksController : ControllerBase
    {
        private readonly AppDbContext _context;

        public VendorProfileTasksController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/VendorProfileTasks/vendor/{vendorNo}
        [HttpGet("vendor/{vendorNo}")]
        public async Task<ActionResult<IEnumerable<VendorProfileTask>>> GetVendorTasks(string vendorNo)
        {
            return await _context.VendorProfileTasks
                .Where(t => t.VendorNo == vendorNo && t.Status == "open")
                .OrderByDescending(t => t.CreatedDate)
                .ToListAsync();
        }

        // POST: api/VendorProfileTasks
        [HttpPost]
        public async Task<ActionResult<VendorProfileTask>> PostVendorProfileTask(VendorProfileTask vendorProfileTask)
        {
            // Ensure status and date are set
            vendorProfileTask.CreatedDate = System.DateOnly.FromDateTime(System.DateTime.UtcNow);
            vendorProfileTask.Status = "open";

            _context.VendorProfileTasks.Add(vendorProfileTask);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetVendorProfileTask", new { id = vendorProfileTask.Id }, vendorProfileTask);
        }

        // GET: api/VendorProfileTasks/5
        [HttpGet("{id}")]
        public async Task<ActionResult<VendorProfileTask>> GetVendorProfileTask(int id)
        {
            var vendorProfileTask = await _context.VendorProfileTasks.FindAsync(id);

            if (vendorProfileTask == null)
            {
                return NotFound();
            }

            return vendorProfileTask;
        }

        // GET: api/VendorProfileTasks/pending
        [HttpGet("pending")]
        public async Task<ActionResult<IEnumerable<VendorProfileTask>>> GetPendingTasks()
        {
            return await _context.VendorProfileTasks
                .Where(t => t.Status == "open")
                .OrderByDescending(t => t.CreatedDate)
                .ToListAsync();
        }

        // PUT: api/VendorProfileTasks/{id}/close
        [HttpPut("{id}/close")]
        public async Task<IActionResult> CloseTasks(int id, [FromBody] List<string> tasksToClose)
        {
            var vendorProfileTask = await _context.VendorProfileTasks.FindAsync(id);

            if (vendorProfileTask == null)
            {
                return NotFound();
            }

            // Get existing closed tasks
            var existingClosed = string.IsNullOrEmpty(vendorProfileTask.ClosedTasks) 
                ? new List<string>() 
                : vendorProfileTask.ClosedTasks.Split(',').Select(t => t.Trim()).ToList();

            // Append new ones without duplicates
            foreach (var task in tasksToClose)
            {
                if (!existingClosed.Contains(task.Trim()))
                {
                    existingClosed.Add(task.Trim());
                }
            }

            vendorProfileTask.ClosedTasks = string.Join(",", existingClosed);

            // Check if all selected tasks are now closed
            var selected = vendorProfileTask.SelectedTasks.Split(',').Select(t => t.Trim()).ToList();
            bool allClosed = selected.All(t => existingClosed.Contains(t));

            if (allClosed)
            {
                vendorProfileTask.Status = "closed";
            }

            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
