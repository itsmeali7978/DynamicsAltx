using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Backend.Models
{
    public class CashierClosingDocument
    {
        [Key]
        public int Id { get; set; }

        public int CashierClosingId { get; set; }
        
        [ForeignKey("CashierClosingId")]
        [JsonIgnore]
        public CashierClosing CashierClosing { get; set; }

        [Required]
        [StringLength(20)]
        public string DocumentType { get; set; } // "Invoice" or "CrMemo"

        [Required]
        [StringLength(50)]
        public string DocumentNo { get; set; }

        [StringLength(50)]
        public string CustomerNo { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal AmountIncVAT { get; set; }

        public DateTime PostingDate { get; set; }
    }
}
