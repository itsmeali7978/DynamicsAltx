using System.ComponentModel.DataAnnotations;

namespace Backend.Models
{
    public class PrinterSetting
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Type { get; set; } = string.Empty; // "Shelf Label", "Item Label", "Normal Print"

        [Required]
        public string Location { get; set; } = string.Empty; // LocationCode from Locations

        [Required]
        public string PrinterName { get; set; } = string.Empty;

        public string PrintMethod { get; set; } = "Zebra Command"; // "Zebra Command", "Report Printing"
    }
}
