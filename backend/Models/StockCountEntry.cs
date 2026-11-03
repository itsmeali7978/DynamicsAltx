using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    [Table("StockCountEntries")]
    public class StockCountEntry
    {
        [Key]
        public int Id { get; set; }

        [StringLength(100)]
        public string? Barcode { get; set; }

        [Required]
        [StringLength(50)]
        public string SKU { get; set; } = string.Empty;

        public string? Description { get; set; }

        [StringLength(50)]
        public string? BaseUOM { get; set; }

        [Required]
        [StringLength(100)]
        public string ScannedUOM { get; set; } = string.Empty;

        [StringLength(50)]
        public string? UOMCode { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal Qty { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal QtyPerUOM { get; set; }

        [Column(TypeName = "decimal(18, 4)")]
        public decimal ConvertedQty { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [StringLength(100)]
        public string? CreatedBy { get; set; }

        [StringLength(50)]
        public string? Location { get; set; }

        [StringLength(100)]
        public string? BatchName { get; set; }

        /// <summary>
        /// Status: 0 = Pending/Active (visible in user's grid), 1 = Verified (archived/hidden from grid)
        /// </summary>
        public int Status { get; set; } = 0;
    }
}
