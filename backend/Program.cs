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

// Serve static files from the 'login-page' directory
var loginPagePath = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", "login-page"));
if (Directory.Exists(loginPagePath))
{
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(loginPagePath)
    });
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(loginPagePath)
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

    if (!context.Users.Any())
    {
        context.Users.Add(new User
        {
            Email = "admin@example.com",
            PasswordHash = "password123" // In production, this should be hashed
        });
        context.SaveChanges();
    }
}

app.Run();
