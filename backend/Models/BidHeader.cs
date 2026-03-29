using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class BidHeader
    {
        [Key]
        public string BidNo { get; set; } = string.Empty; // Format: BDREQ-100
        
        [DataType(DataType.Date)]
        public DateTime CreatedDate { get; set; } = DateTime.Now.Date;

        [Required]
        [StringLength(50)]
        public string Status { get; set; } = "Active";

        public string? NAVDocNo { get; set; }
    }
}
