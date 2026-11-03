using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddInventorySyncMasterTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Altx Inv Items",
                columns: table => new
                {
                    ItemNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ArabicName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EnglishName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BaseUOM = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Altx Inv Items", x => x.ItemNo);
                });

            migrationBuilder.CreateTable(
                name: "Altx Inv ItemUOM",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ItemNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    UOMCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    QtyPerUOM = table.Column<decimal>(type: "decimal(18,4)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Altx Inv ItemUOM", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Altx Inv ItemBarcodes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BarcodeNo = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ItemNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    UOMCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Altx Inv ItemBarcodes", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "InventorySyncStatus",
                columns: table => new
                {
                    TableName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    DisplayName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    NavSourceTable = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastSyncDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RecordCount = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventorySyncStatus", x => x.TableName);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Altx Inv ItemUOM_ItemNo",
                table: "Altx Inv ItemUOM",
                column: "ItemNo");

            migrationBuilder.CreateIndex(
                name: "IX_Altx Inv ItemBarcodes_BarcodeNo",
                table: "Altx Inv ItemBarcodes",
                column: "BarcodeNo");

            migrationBuilder.CreateIndex(
                name: "IX_Altx Inv ItemBarcodes_ItemNo",
                table: "Altx Inv ItemBarcodes",
                column: "ItemNo");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "Altx Inv Items");
            migrationBuilder.DropTable(name: "Altx Inv ItemUOM");
            migrationBuilder.DropTable(name: "Altx Inv ItemBarcodes");
            migrationBuilder.DropTable(name: "InventorySyncStatus");
        }
    }
}
