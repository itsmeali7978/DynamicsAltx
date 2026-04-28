using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    public class Shift
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)] // ShiftNo is manually entered
        public string ShiftNo { get; set; }

        [Required]
        public string ShiftTime { get; set; }

        public int WorkingHours { get; set; }
    }
}
