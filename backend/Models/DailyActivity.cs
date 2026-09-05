using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    [Table("DailyActivities")]
    public class DailyActivity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public DateTime ActivityDate { get; set; }

        [Required]
        public int ItemNo { get; set; }

        public string? DescEng { get; set; }

        public string? DescAra { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal ProducedQty { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal ExpiredQty { get; set; }

        public string? ExpiryReason { get; set; }

        public string? Notes { get; set; }

        public string? CreatedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
