using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Backend.Models
{
    public class BidItemDistribution
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(450)]
        public string BidHNo { get; set; } = string.Empty;

        public string? NAVDocNo { get; set; }

        public int NAVSku { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Qty { get; set; }

        [StringLength(100)]
        public string? Location { get; set; }

        [JsonIgnore]
        [ForeignKey("BidHNo")]
        public BidHeader BidHeader { get; set; } = null!;
    }
}
