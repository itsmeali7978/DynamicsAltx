using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddBiddingSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BidHeaders",
                columns: table => new
                {
                    BidNo = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BidHeaders", x => x.BidNo);
                });

            migrationBuilder.CreateTable(
                name: "BidLines",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BidHNo = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    NAVDocNo = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    NAVSku = table.Column<int>(type: "int", nullable: false),
                    UOM = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Quantity = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BidLines", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BidLines_BidHeaders_BidHNo",
                        column: x => x.BidHNo,
                        principalTable: "BidHeaders",
                        principalColumn: "BidNo",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VendorSubPrices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BidLineId = table.Column<int>(type: "int", nullable: false),
                    VendorId = table.Column<int>(type: "int", nullable: false),
                    Cost = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VendorSubPrices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_VendorSubPrices_BidLines_BidLineId",
                        column: x => x.BidLineId,
                        principalTable: "BidLines",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_VendorSubPrices_VendorSubs_VendorId",
                        column: x => x.VendorId,
                        principalTable: "VendorSubs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BidLines_BidHNo",
                table: "BidLines",
                column: "BidHNo");

            migrationBuilder.CreateIndex(
                name: "IX_VendorSubPrices_BidLineId",
                table: "VendorSubPrices",
                column: "BidLineId");

            migrationBuilder.CreateIndex(
                name: "IX_VendorSubPrices_VendorId",
                table: "VendorSubPrices",
                column: "VendorId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VendorSubPrices");

            migrationBuilder.DropTable(
                name: "BidLines");

            migrationBuilder.DropTable(
                name: "BidHeaders");
        }
    }
}
