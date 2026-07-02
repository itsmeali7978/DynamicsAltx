using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class UserProfile
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string ProfileName { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string DashboardPage { get; set; } = "dashboard.html";

        public ICollection<ProfilePage> AllowedPages { get; set; } = new List<ProfilePage>();
    }
}
