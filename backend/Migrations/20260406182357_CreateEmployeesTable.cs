using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class CreateEmployeesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Employees",
                columns: table => new
                {
                    EmpId = table.Column<int>(type: "int", nullable: false),
                    EnglishName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ArabicName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    NationalityCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Gender = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    MobileNo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DOB = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Profession = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    JobTitle = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LocationCode = table.Column<string>(type: "nvarchar(15)", maxLength: 15, nullable: false),
                    ShiftNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Section = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    BloodGroup = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    IqamaExpiryGrego = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IqamaExpiryHijiri = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IqamaNo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    PassportNo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    PassportExpiry = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DateOfJoin = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    HealthMedicalDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    HealthMadrasaDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    HealthStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Employees", x => x.EmpId);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Employees");
        }
    }
}
