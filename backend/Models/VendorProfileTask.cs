using System;
using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class VendorProfileTask
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(50)]
        public string VendorNo { get; set; } = string.Empty;

        [StringLength(255)]
        public string VendorNameEng { get; set; } = string.Empty;

        [StringLength(255)]
        public string VendorNameArb { get; set; } = string.Empty;

        [Required]
        public string SelectedTasks { get; set; } = string.Empty;

        public string Comments { get; set; } = string.Empty;

        public string ClosedTasks { get; set; } = string.Empty;

        public DateOnly CreatedDate { get; set; } = DateOnly.FromDateTime(DateTime.UtcNow);

        [Required]
        [StringLength(20)]
        public string Status { get; set; } = "open";
    }
}
