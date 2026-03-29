using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class VoucherHistory
    {
        [Key]
        [StringLength(50)]
        public string VoucherNo { get; set; } = string.Empty;

        [DataType(DataType.Date)]
        public DateTime CreatedDate { get; set; } = DateTime.Now.Date;

        [DataType(DataType.Date)]
        public DateTime TransDate { get; set; }

        [StringLength(100)]
        public string CreatedUser { get; set; } = string.Empty;

        [StringLength(10)]
        public string TransLocation { get; set; } = string.Empty;
    }
}
