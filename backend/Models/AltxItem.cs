using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    [Table("AltxItems")]
    public class AltxItem
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public int ItemNo { get; set; }

        public string? DescEng { get; set; }

        public string? DescAra { get; set; }

        public string? Brand { get; set; }

        public string? VendorNo { get; set; }

        public string? ShelfClass { get; set; }

        public string? ALtxDivision { get; set; }

        public bool Status { get; set; } = true;
    }
}
