using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Backend.Data;
using Backend.Helpers;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PrinterSettingsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public PrinterSettingsController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/PrinterSettings
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PrinterSetting>>> GetPrinterSettings()
        {
            return await _context.PrinterSettings.ToListAsync();
        }

        // GET: api/PrinterSettings/5
        [HttpGet("{id}")]
        public async Task<ActionResult<PrinterSetting>> GetPrinterSetting(int id)
        {
            var printerSetting = await _context.PrinterSettings.FindAsync(id);

            if (printerSetting == null)
            {
                return NotFound(new { message = "Printer setting not found." });
            }

            return printerSetting;
        }

        // POST: api/PrinterSettings
        [HttpPost]
        public async Task<ActionResult<PrinterSetting>> SavePrinterSetting([FromBody] PrinterSetting dto)
        {
            if (dto == null)
            {
                return BadRequest(new { message = "Invalid data." });
            }

            if (string.IsNullOrWhiteSpace(dto.Type) || string.IsNullOrWhiteSpace(dto.Location) || string.IsNullOrWhiteSpace(dto.PrinterName))
            {
                return BadRequest(new { message = "Type, Location, and Printer Name are required fields." });
            }

            // Check if existing setting for same Type & Location
            var existing = await _context.PrinterSettings
                .FirstOrDefaultAsync(p => p.Id != dto.Id && p.Type == dto.Type && p.Location == dto.Location);

            if (existing != null)
            {
                // Update existing record
                existing.PrinterName = dto.PrinterName;
                if (!string.IsNullOrWhiteSpace(dto.PrintMethod))
                {
                    existing.PrintMethod = dto.PrintMethod;
                }
                _context.Entry(existing).State = EntityState.Modified;
                await _context.SaveChangesAsync();
                return Ok(existing);
            }

            if (dto.Id > 0)
            {
                var target = await _context.PrinterSettings.FindAsync(dto.Id);
                if (target != null)
                {
                    target.Type = dto.Type;
                    target.Location = dto.Location;
                    target.PrinterName = dto.PrinterName;
                    if (!string.IsNullOrWhiteSpace(dto.PrintMethod))
                    {
                        target.PrintMethod = dto.PrintMethod;
                    }
                    _context.Entry(target).State = EntityState.Modified;
                    await _context.SaveChangesAsync();
                    return Ok(target);
                }
            }

            _context.PrinterSettings.Add(dto);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetPrinterSetting), new { id = dto.Id }, dto);
        }

        // DELETE: api/PrinterSettings/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletePrinterSetting(int id)
        {
            var printerSetting = await _context.PrinterSettings.FindAsync(id);
            if (printerSetting == null)
            {
                return NotFound(new { message = "Printer setting not found." });
            }

            _context.PrinterSettings.Remove(printerSetting);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Printer setting deleted successfully." });
        }

        // GET: api/PrinterSettings/printers
        [HttpGet("printers")]
        public IActionResult GetInstalledPrinters()
        {
            try
            {
                var printers = RawPrinterHelper.GetInstalledPrinters();
                return Ok(printers);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Failed to fetch installed printers: {ex.Message}" });
            }
        }

        // GET: api/PrinterSettings/locations
        [HttpGet("locations")]
        public async Task<ActionResult> GetAvailableLocations()
        {
            try
            {
                var locations = await _context.Locations
                    .Select(l => new { l.LocationCode, l.LocationName })
                    .OrderBy(l => l.LocationCode)
                    .ToListAsync();

                return Ok(locations);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Failed to fetch locations: {ex.Message}" });
            }
        }
    }
}
