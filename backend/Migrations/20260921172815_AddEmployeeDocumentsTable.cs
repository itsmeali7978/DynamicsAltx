using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeDocumentsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BloodGroup",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "HealthMadrasaDate",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "HealthMedicalDate",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "HealthStatus",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "IqamaExpiryGrego",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "IqamaExpiryHijiri",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "PassportExpiry",
                table: "Employees");

            migrationBuilder.CreateTable(
                name: "Employee Documents",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmpId = table.Column<int>(type: "int", nullable: false),
                    HealthMedicalDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    HealthMadrasaDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    HealthStatus = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IqamaNo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IqamaExpiryGrego = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IqamaExpiryHijiri = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PassportNo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PassportIssue = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PassportExpiry = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ContractExpiry = table.Column<DateTime>(type: "datetime2", nullable: true),
                    BloodGroup = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Employee Documents", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Employee Documents");

            migrationBuilder.AddColumn<string>(
                name: "BloodGroup",
                table: "Employees",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "HealthMadrasaDate",
                table: "Employees",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "HealthMedicalDate",
                table: "Employees",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "HealthStatus",
                table: "Employees",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "IqamaExpiryGrego",
                table: "Employees",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "IqamaExpiryHijiri",
                table: "Employees",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PassportExpiry",
                table: "Employees",
                type: "datetime2",
                nullable: true);
        }
    }
}
