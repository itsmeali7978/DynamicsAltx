using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class VendorSub
    {
        [Key]
        public int Id { get; set; }
        public string VendorName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string NavReferCode { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string MobileNo { get; set; } = string.Empty;
    }
}
