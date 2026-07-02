using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Backend.Models
{
    public class CashierClosingPending
    {
        [Key]
        public int Id { get; set; }

        public int CashierClosingId { get; set; }
        
        [ForeignKey("CashierClosingId")]
        [JsonIgnore]
        public CashierClosing CashierClosing { get; set; }

        [StringLength(50)]
        public string EmpId { get; set; }

        [StringLength(150)]
        public string EmpName { get; set; }

        [StringLength(255)]
        public string CustomerComments { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }
    }
}
