using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Backend.Models
{
    public class VendorSubPrice
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int BidLineId { get; set; }

        [Required]
        public int VendorId { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Cost { get; set; }

        [JsonIgnore]
        [ForeignKey("BidLineId")]
        public BidLine BidLine { get; set; } = null!;
 
        [JsonIgnore]
        [ForeignKey("VendorId")]
        public VendorSub VendorSub { get; set; } = null!;
    }
}
