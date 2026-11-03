using Backend.Data;
using Backend.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Configure the DbContext with SQL Server
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

// Configure CORS so the frontend can talk to the backend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy => policy.SetIsOriginAllowed(_ => true)
                        .AllowAnyHeader()
                        .AllowAnyMethod());
});

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// app.UseHttpsRedirection();

// Serve static files (Fallback from local wwwroot to development login-page)
var wwwrootPath = Path.Combine(builder.Environment.ContentRootPath, "wwwroot");
var loginPagePath = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", "login-page"));

string? activeStaticPath = null;
if (Directory.Exists(wwwrootPath) && File.Exists(Path.Combine(wwwrootPath, "index.html"))) activeStaticPath = wwwrootPath;
else if (Directory.Exists(loginPagePath)) activeStaticPath = loginPagePath;

if (activeStaticPath != null)
{
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(activeStaticPath)
    });
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(activeStaticPath)
    });
}

// Enable CORS
app.UseCors("AllowFrontend");

app.UseAuthorization();

// Map controller routes
app.MapControllers();

// Seed Default User
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<AppDbContext>();
    
    // Automatically apply any pending migrations
    context.Database.Migrate();

    try
    {
        await context.Database.ExecuteSqlRawAsync(@"
            IF NOT EXISTS (
                SELECT 1 FROM sys.columns 
                WHERE object_id = OBJECT_ID(N'[PrinterSettings]') 
                AND name = 'PrintMethod'
            )
            BEGIN
                ALTER TABLE [PrinterSettings] ADD [PrintMethod] nvarchar(max) NOT NULL DEFAULT 'Zebra Command';
            END

            IF NOT EXISTS (
                SELECT 1 FROM sys.columns 
                WHERE object_id = OBJECT_ID(N'[Employees]') 
                AND name = 'PermanentStatus'
            )
            BEGIN
                ALTER TABLE [Employees] ADD [PermanentStatus] nvarchar(50) NULL;
            END

            IF NOT EXISTS (
                SELECT 1 FROM sys.columns 
                WHERE object_id = OBJECT_ID(N'[Users]') 
                AND name = 'MobileBatchName'
            )
            BEGIN
                ALTER TABLE [Users] ADD [MobileBatchName] nvarchar(100) NULL;
            END

            IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Altx Inv Items')
            BEGIN
                CREATE TABLE [Altx Inv Items] (
                    [ItemNo] nvarchar(50) NOT NULL PRIMARY KEY,
                    [ArabicName] nvarchar(max) NULL,
                    [EnglishName] nvarchar(max) NULL,
                    [BaseUOM] nvarchar(50) NULL
                );
            END

            IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Altx Inv ItemUOM')
            BEGIN
                CREATE TABLE [Altx Inv ItemUOM] (
                    [Id] int IDENTITY(1,1) PRIMARY KEY,
                    [ItemNo] nvarchar(50) NOT NULL,
                    [UOMCode] nvarchar(50) NOT NULL,
                    [QtyPerUOM] decimal(18, 4) NOT NULL
                );
                CREATE INDEX [IX_AltxInvItemUOM_ItemNo] ON [Altx Inv ItemUOM] ([ItemNo]);
            END

            IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Altx Inv ItemBarcodes')
            BEGIN
                CREATE TABLE [Altx Inv ItemBarcodes] (
                    [Id] int IDENTITY(1,1) PRIMARY KEY,
                    [BarcodeNo] nvarchar(100) NOT NULL,
                    [ItemNo] nvarchar(50) NOT NULL,
                    [UOMCode] nvarchar(50) NULL
                );
                CREATE INDEX [IX_AltxInvItemBarcodes_BarcodeNo] ON [Altx Inv ItemBarcodes] ([BarcodeNo]);
                CREATE INDEX [IX_AltxInvItemBarcodes_ItemNo] ON [Altx Inv ItemBarcodes] ([ItemNo]);
            END

            IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'InventorySyncStatus')
            BEGIN
                CREATE TABLE [InventorySyncStatus] (
                    [TableName] nvarchar(100) NOT NULL PRIMARY KEY,
                    [DisplayName] nvarchar(100) NOT NULL,
                    [NavSourceTable] nvarchar(100) NOT NULL,
                    [LastSyncDate] datetime2 NULL,
                    [RecordCount] int NOT NULL DEFAULT 0,
                    [Status] nvarchar(50) NOT NULL DEFAULT 'Ready'
                );

                INSERT INTO [InventorySyncStatus] ([TableName], [DisplayName], [NavSourceTable], [Status])
                VALUES 
                    ('Altx Inv Items', 'Altx Inv Items', 'Item', 'Ready'),
                    ('Altx Inv ItemUOM', 'Altx Inv ItemUOM', 'Item Unit of Measure', 'Ready'),
                    ('Altx Inv ItemBarcodes', 'Altx Inv ItemBarcodes', 'Barcodes', 'Ready');
            END

            IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'StockCountEntries')
            BEGIN
                CREATE TABLE [StockCountEntries] (
                    [Id] int IDENTITY(1,1) PRIMARY KEY,
                    [Barcode] nvarchar(100) NULL,
                    [SKU] nvarchar(50) NOT NULL,
                    [Description] nvarchar(max) NULL,
                    [BaseUOM] nvarchar(50) NULL,
                    [ScannedUOM] nvarchar(100) NOT NULL,
                    [UOMCode] nvarchar(50) NULL,
                    [Qty] decimal(18, 4) NOT NULL,
                    [QtyPerUOM] decimal(18, 4) NOT NULL,
                    [ConvertedQty] decimal(18, 4) NOT NULL,
                    [CreatedAt] datetime2 NOT NULL DEFAULT GETUTCDATE(),
                    [CreatedBy] nvarchar(100) NULL,
                    [Location] nvarchar(50) NULL,
                    [BatchName] nvarchar(100) NULL,
                    [Status] int NOT NULL DEFAULT 0
                );
                CREATE INDEX [IX_StockCountEntries_SKU] ON [StockCountEntries] ([SKU]);
                CREATE INDEX [IX_StockCountEntries_CreatedAt] ON [StockCountEntries] ([CreatedAt]);
                CREATE INDEX [IX_StockCountEntries_User_Status] ON [StockCountEntries] ([CreatedBy], [Status], [Id] DESC);
            END
            ELSE
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[StockCountEntries]') AND name = 'Status')
                BEGIN
                    ALTER TABLE [StockCountEntries] ADD [Status] int NOT NULL DEFAULT 0;
                END
                IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_StockCountEntries_User_Status' AND object_id = OBJECT_ID(N'[StockCountEntries]'))
                BEGIN
                    CREATE INDEX [IX_StockCountEntries_User_Status] ON [StockCountEntries] ([CreatedBy], [Status], [Id] DESC);
                END
            END

            IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'VehicleExpenses')
            BEGIN
                CREATE TABLE [VehicleExpenses] (
                    [Id] int IDENTITY(1,1) PRIMARY KEY,
                    [VehicleCode] nvarchar(50) NOT NULL,
                    [VehicleName] nvarchar(250) NULL,
                    [ExpenseType] nvarchar(100) NOT NULL DEFAULT 'General',
                    [Amount] decimal(18, 2) NOT NULL DEFAULT 0,
                    [Description] nvarchar(max) NULL,
                    [ExpenseDate] datetime2 NOT NULL DEFAULT GETDATE(),
                    [CreatedBy] nvarchar(100) NULL,
                    [CreatedAt] datetime2 NOT NULL DEFAULT GETDATE()
                );
                CREATE INDEX [IX_VehicleExpenses_VehicleCode] ON [VehicleExpenses] ([VehicleCode]);
            END
        ");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Program] PrinterSettings column check exception: {ex.Message}");
    }

    // Seeding/Updating Admin
    var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Email == "admin@example.com");
    if (adminUser == null)
    {
        context.Users.Add(new User
        {
            Email = "admin@example.com",
            Name = "Admin User",
            PasswordHash = "password123",
            Location = "HO",
            Role = "Admin"
        });
        await context.SaveChangesAsync();
    }
    else
    {
        // Ensure existing admin@example.com is an Admin and has the correct password for this session
        adminUser.Role = "Admin";
        adminUser.PasswordHash = "password123";
        await context.SaveChangesAsync();

        // Seed default PrinterSetting for Location 'HO' if empty
        if (!await context.PrinterSettings.AnyAsync(p => p.Location == "HO" && p.Type == "Shelf Label"))
        {
            context.PrinterSettings.Add(new PrinterSetting
            {
                Type = "Shelf Label",
                Location = "HO",
                PrinterName = "ZDesigner GK420t (Copy 2)"
            });
            await context.SaveChangesAsync();
        }
    }
}

app.Run();
