using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class Employee
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)] // EmpId manually entered
        [StringLength(20)]
        public string EmpId { get; set; }

        [Required]
        [StringLength(100)]
        public string EnglishName { get; set; }

        [StringLength(100)]
        public string ArabicName { get; set; }

        [StringLength(20)]
        public string NationalityCode { get; set; }

        [StringLength(10)]
        public string Gender { get; set; } // Male / Female

        [StringLength(20)]
        public string MobileNo { get; set; }

        public DateTime? DOB { get; set; }

        [StringLength(100)]
        public string Profession { get; set; }

        [StringLength(100)]
        public string JobTitle { get; set; }

        [StringLength(15)]
        public string LocationCode { get; set; }

        [StringLength(50)]
        public string ShiftNo { get; set; }

        [StringLength(50)]
        public string Section { get; set; }

        [StringLength(10)]
        public string BloodGroup { get; set; }

        public DateTime? IqamaExpiryGrego { get; set; }

        public DateTime? IqamaExpiryHijiri { get; set; }

        [StringLength(20)]
        public string IqamaNo { get; set; }

        [StringLength(20)]
        public string PassportNo { get; set; }

        public DateTime? PassportExpiry { get; set; }

        public DateTime? DateOfJoin { get; set; }

        [StringLength(20)]
        public string Status { get; set; } // Active / Passive

        public DateTime? HealthMedicalDate { get; set; }

        public DateTime? HealthMadrasaDate { get; set; }

        [StringLength(20)]
        public string HealthStatus { get; set; } // Active / Passive
    }
}
