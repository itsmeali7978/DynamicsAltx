using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAltxItemsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AltxItems",
                columns: table => new
                {
                    ItemNo = table.Column<int>(type: "int", nullable: false),
                    DescEng = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DescAra = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Brand = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    VendorNo = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShelfClass = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ALtxDivision = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AltxItems", x => x.ItemNo);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AltxItems");
        }
    }
}
