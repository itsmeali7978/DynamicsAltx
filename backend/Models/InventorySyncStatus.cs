using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Backend.Models
{
    [Table("InventorySyncStatus")]
    public class InventorySyncStatus
    {
        [Key]
        [StringLength(100)]
        public string TableName { get; set; } = string.Empty;

        [StringLength(100)]
        public string DisplayName { get; set; } = string.Empty;

        [StringLength(100)]
        public string NavSourceTable { get; set; } = string.Empty;

        public DateTime? LastSyncDate { get; set; }

        public int RecordCount { get; set; } = 0;

        [StringLength(50)]
        public string Status { get; set; } = "Ready";
    }
}
