using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class CashierClosing
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string EmployeeNo { get; set; }

        [Required]
        public DateTime ClosingDate { get; set; }

        [Required]
        [StringLength(15)]
        public string LocationCode { get; set; }

        [StringLength(50)]
        public string StartingInvoiceNo { get; set; }

        [StringLength(50)]
        public string ClosingInvoiceNo { get; set; }

        [StringLength(50)]
        public string StartingCreditMemoNo { get; set; }

        [StringLength(50)]
        public string ClosingCreditMemoNo { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalBankPOS { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalBankTransfer { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalBank { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalCash { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalPendingCash { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal SystemSalesAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal SystemReturnAmount { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal Difference { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [StringLength(100)]
        public string CreatedBy { get; set; }

        // Navigation Properties
        public ICollection<CashierClosingDenomination> Denominations { get; set; } = new List<CashierClosingDenomination>();
        public ICollection<CashierClosingPending> PendingCash { get; set; } = new List<CashierClosingPending>();
        public ICollection<CashierClosingDocument> Documents { get; set; } = new List<CashierClosingDocument>();
    }
}
