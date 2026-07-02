using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<VendorSub> VendorSubs { get; set; }
        public DbSet<BidHeader> BidHeaders { get; set; }
        public DbSet<BidLine> BidLines { get; set; }
        public DbSet<VendorSubPrice> VendorSubPrices { get; set; }
        public DbSet<BidItemDistribution> BidItemDistributions { get; set; }
        public DbSet<VoucherHistory> VoucherHistories { get; set; }
        public DbSet<Announcement> Announcements { get; set; }
        public DbSet<Location> Locations { get; set; }
        public DbSet<Nationality> Nationalities { get; set; }
        public DbSet<Shift> Shifts { get; set; }
        public DbSet<Employee> Employees { get; set; }
        public DbSet<ShortBreak> ShortBreaks { get; set; }
        public DbSet<CashierClosing> CashierClosings { get; set; }
        public DbSet<CashierClosingDenomination> CashierClosingDenominations { get; set; }
        public DbSet<CashierClosingPending> CashierClosingPendings { get; set; }
        public DbSet<CashierClosingDocument> CashierClosingDocuments { get; set; }
        public DbSet<LeaveType> LeaveTypes { get; set; }
        public DbSet<AbsenceMarker> AbsenceMarkers { get; set; }
        public DbSet<UserProfile> UserProfiles { get; set; }
        public DbSet<ProfilePage> ProfilePages { get; set; }
    }
}
