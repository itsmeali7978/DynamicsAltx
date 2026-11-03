using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    [Table("Altx Inv Items")]
    public class AltxInvItem
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        [StringLength(50)]
        public string ItemNo { get; set; } = string.Empty;

        public string? ArabicName { get; set; }

        public string? EnglishName { get; set; }

        [StringLength(50)]
        public string? BaseUOM { get; set; }
    }
}
