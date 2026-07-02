using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class AbsenceMarker
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(20)]
        public string EmployeeNo { get; set; }

        [Required]
        public int LeaveTypeId { get; set; }

        [ForeignKey("LeaveTypeId")]
        public LeaveType? LeaveType { get; set; }

        [Required]
        public DateTime LeaveDate { get; set; }

        [Required]
        [StringLength(100)]
        public string Location { get; set; }

        public string? Comments { get; set; }

        [Required]
        public DateTime CreatedDate { get; set; }

        [Required]
        [StringLength(100)]
        public string CreatedUser { get; set; }
    }
}
