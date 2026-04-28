using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class Nationality
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Nation { get; set; } = string.Empty;
    }
}
