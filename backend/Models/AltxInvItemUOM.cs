using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    [Table("Altx Inv ItemUOM")]
    public class AltxInvItemUOM
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string ItemNo { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string UOMCode { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18, 4)")]
        public decimal QtyPerUOM { get; set; }
    }
}
