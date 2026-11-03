using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    [Table("Employee Documents")]
    public class EmployeeDocument
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        public int EmpId { get; set; }

        public DateTime? HealthMedicalDate { get; set; }

        public DateTime? HealthMadrasaDate { get; set; }

        public string? HealthStatus { get; set; }

        public string? IqamaNo { get; set; }

        public DateTime? IqamaExpiryGrego { get; set; }

        public DateTime? IqamaExpiryHijiri { get; set; }

        public string? PassportNo { get; set; }

        public DateTime? PassportIssue { get; set; }

        public DateTime? PassportExpiry { get; set; }

        public DateTime? ContractExpiry { get; set; }

        public string? BloodGroup { get; set; }
    }
}
