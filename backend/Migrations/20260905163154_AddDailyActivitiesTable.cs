using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddDailyActivitiesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DailyActivities",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ActivityDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ItemNo = table.Column<int>(type: "int", nullable: false),
                    DescEng = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DescAra = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ProducedQty = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ExpiredQty = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ExpiryReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyActivities", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DailyActivities");
        }
    }
}
