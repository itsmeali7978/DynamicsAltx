using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Backend.Models
{
    public class CashierClosingDenomination
    {
        [Key]
        public int Id { get; set; }

        public int CashierClosingId { get; set; }
        
        [ForeignKey("CashierClosingId")]
        [JsonIgnore]
        public CashierClosing CashierClosing { get; set; }

        [Required]
        [StringLength(50)]
        public string Denomination { get; set; }

        public int Quantity { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal LineTotal { get; set; }
    }
}
