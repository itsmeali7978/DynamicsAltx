using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class ShortBreak
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(20)]
        public string EmpId { get; set; }

        public DateTime BreakStart { get; set; }

        public DateTime? BreakEnd { get; set; }

        public int? TotalMinutes { get; set; }

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "Open"; // "Open" or "Closed"
    }
}
