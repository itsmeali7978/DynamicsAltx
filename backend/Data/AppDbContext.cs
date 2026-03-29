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
        public DbSet<VoucherHistory> VoucherHistories { get; set; }
        public DbSet<Announcement> Announcements { get; set; }
        public DbSet<Location> Locations { get; set; }
    }
}
