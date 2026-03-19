using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Backend.Models
{
    public class BidLine
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string BidHNo { get; set; } = string.Empty;

        public string? NAVDocNo { get; set; }

        [Range(0, 9999999)]
        public int NAVSku { get; set; }

        public string? UOM { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Quantity { get; set; }

        [StringLength(450)]
        public string? Description { get; set; }

        public ICollection<VendorSubPrice> Prices { get; set; } = new List<VendorSubPrice>();
        
        [JsonIgnore]
        [ForeignKey("BidHNo")]
        public BidHeader BidHeader { get; set; } = null!;
    }
}
