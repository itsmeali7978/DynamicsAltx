using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    [Table("Altx Inv ItemBarcodes")]
    public class AltxInvItemBarcode
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string BarcodeNo { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string ItemNo { get; set; } = string.Empty;

        [StringLength(50)]
        public string? UOMCode { get; set; }
    }
}
