using System;

namespace Backend.Models
{
    public class VehicleExpense
    {
        public int Id { get; set; }
        public string VehicleCode { get; set; } = string.Empty;
        public string VehicleName { get; set; } = string.Empty;
        public string ExpenseType { get; set; } = "General"; // Fuel, Maintenance, Oil Change, Repairs, Insurance, Registration, Other
        public decimal Amount { get; set; }
        public string? Description { get; set; }
        public DateTime ExpenseDate { get; set; } = DateTime.Now;
        public string? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
