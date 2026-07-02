using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Backend.Models
{
    public class ProfilePage
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ProfileId { get; set; }

        [ForeignKey("ProfileId")]
        [JsonIgnore]
        public UserProfile? Profile { get; set; }

        [Required]
        [StringLength(100)]
        public string PagePath { get; set; } = string.Empty;
    }
}
