using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class Location
    {
        [Key]
        [StringLength(15)]
        public string LocationCode { get; set; }

        [Required]
        [StringLength(50)]
        public string LocationName { get; set; }

        [StringLength(50)]
        public string IPAddress { get; set; }

        [StringLength(50)]
        public string DbName { get; set; }

        [StringLength(50)]
        public string Username { get; set; }

        [StringLength(255)]
        public string Password { get; set; }

        [StringLength(20)]
        public string Status { get; set; } = "Passive";
    }
}
