using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class VendorTask
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(255)]
        public string NameEng { get; set; } = string.Empty;

        [Required]
        [StringLength(255)]
        public string NameArb { get; set; } = string.Empty;
    }
}
