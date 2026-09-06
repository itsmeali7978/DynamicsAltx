using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    [Table("FetchedSalesData")]
    public class FetchedSalesData
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public DateTime SalesDate { get; set; }

        [Required]
        public int ItemNo { get; set; }

        public string? DescEng { get; set; }

        public string? DescAra { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Qty { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal NetAmount { get; set; }

        public string? FetchedBy { get; set; }

        public DateTime FetchedAt { get; set; } = DateTime.UtcNow;
    }
}
