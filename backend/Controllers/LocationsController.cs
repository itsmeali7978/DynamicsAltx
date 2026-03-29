using Backend.Data;
using Backend.Helpers;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LocationsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public LocationsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Location>>> GetLocations()
        {
            var locations = await _context.Locations.ToListAsync();
            foreach (var loc in locations)
            {
                if (!string.IsNullOrEmpty(loc.Password))
                    loc.Password = EncryptionHelper.Decrypt(loc.Password);
            }
            return locations;
        }

        [HttpGet("{code}")]
        public async Task<ActionResult<Location>> GetLocation(string code)
        {
            var location = await _context.Locations.FindAsync(code);
            if (location == null) return NotFound();
            if (!string.IsNullOrEmpty(location.Password))
                location.Password = EncryptionHelper.Decrypt(location.Password);
            return location;
        }

        [HttpPost]
        public async Task<ActionResult<Location>> PostLocation(Location location)
        {
            if (string.IsNullOrEmpty(location.Status)) location.Status = "Passive";
            if (!string.IsNullOrEmpty(location.Password))
                location.Password = EncryptionHelper.Encrypt(location.Password);

            _context.Locations.Add(location);
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateException)
            {
                if (LocationExists(location.LocationCode)) return Conflict("Location code already exists.");
                else throw;
            }
            return CreatedAtAction("GetLocation", new { code = location.LocationCode }, location);
        }

        [HttpPut("{code}")]
        public async Task<IActionResult> PutLocation(string code, Location location)
        {
            if (code != location.LocationCode) return BadRequest();
            if (!string.IsNullOrEmpty(location.Password))
                location.Password = EncryptionHelper.Encrypt(location.Password);

            _context.Entry(location).State = EntityState.Modified;
            try { await _context.SaveChangesAsync(); }
            catch (DbUpdateConcurrencyException)
            {
                if (!LocationExists(code)) return NotFound();
                else throw;
            }
            return NoContent();
        }

        [HttpDelete("{code}")]
        public async Task<IActionResult> DeleteLocation(string code)
        {
            var location = await _context.Locations.FindAsync(code);
            if (location == null) return NotFound();
            _context.Locations.Remove(location);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // Test database connection using location parameters
        [HttpPost("{code}/TestConnection")]
        public async Task<IActionResult> TestConnection(string code)
        {
            var location = await _context.Locations.FindAsync(code);
            if (location == null)
                return NotFound(new { success = false, message = "Location not found." });

            if (location.Status == "Passive")
                return Ok(new { success = false, message = "Connection testing is only allowed for active locations." });

            string plainPassword = string.IsNullOrEmpty(location.Password)
                ? "" : EncryptionHelper.Decrypt(location.Password);

            var connStr = $"Server={location.IPAddress};Database={location.DbName};" +
                          $"User Id={location.Username};Password={plainPassword};" +
                          $"TrustServerCertificate=True;Connect Timeout=8;";
            try
            {
                using var conn = new SqlConnection(connStr);
                await conn.OpenAsync();
                return Ok(new { success = true, message = $"Connected successfully to '{location.DbName}' on {location.IPAddress}." });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, message = ex.Message });
            }
        }

        private bool LocationExists(string code)
        {
            return _context.Locations.Any(e => e.LocationCode == code);
        }
    }
}
