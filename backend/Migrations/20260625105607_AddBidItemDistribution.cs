using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddBidItemDistribution : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BidItemDistributions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BidHNo = table.Column<string>(type: "nvarchar(450)", maxLength: 450, nullable: false),
                    NAVDocNo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NAVSku = table.Column<int>(type: "int", nullable: false),
                    Qty = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Location = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BidItemDistributions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BidItemDistributions_BidHeaders_BidHNo",
                        column: x => x.BidHNo,
                        principalTable: "BidHeaders",
                        principalColumn: "BidNo",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BidItemDistributions_BidHNo",
                table: "BidItemDistributions",
                column: "BidHNo");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BidItemDistributions");
        }
    }
}
