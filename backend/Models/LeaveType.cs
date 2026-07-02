using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class LeaveType
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string NameEn { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string NameAr { get; set; } = string.Empty;

        public int? MaxDays { get; set; }

        [Required]
        public bool IsPaid { get; set; } = true;
    }
}
