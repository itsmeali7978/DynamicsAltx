using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class VendorSub
    {
        [Key]
        public int Id { get; set; }
        public string VendorName { get; set; }
        public string DisplayName { get; set; }
        public string NavReferCode { get; set; }
        public string Email { get; set; }
        public string MobileNo { get; set; }
    }
}
