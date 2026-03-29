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
        policy => policy.WithOrigins("http://localhost:8000", "http://127.0.0.1:8000", "http://192.168.105.238:8000", "null")
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

app.UseHttpsRedirection();

// Serve static files (Fallback from local wwwroot to development login-page)
var wwwrootPath = Path.Combine(builder.Environment.ContentRootPath, "wwwroot");
var loginPagePath = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", "login-page"));

string? activeStaticPath = null;
if (Directory.Exists(wwwrootPath)) activeStaticPath = wwwrootPath;
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

        // Remove any other "Admin User" named duplicates if they exist with different emails (optional but clean)
        var duplicates = await context.Users.Where(u => u.Name == "Admin User" && u.Email != "admin@example.com").ToListAsync();
        if (duplicates.Any())
        {
            context.Users.RemoveRange(duplicates);
            await context.SaveChangesAsync();
        }
    }
}

app.Run();
