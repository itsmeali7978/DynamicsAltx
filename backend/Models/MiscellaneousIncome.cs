using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class MiscellaneousIncome
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string EntryType { get; set; } = string.Empty; // "Opening Balance", "Income", "Expense"

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }

        [StringLength(500)]
        public string? Remarks { get; set; }

        [Required]
        [DataType(DataType.Date)]
        public DateTime TransactionDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
