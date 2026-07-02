using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCashierClosing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CashierClosings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EmployeeNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ClosingDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LocationCode = table.Column<string>(type: "nvarchar(15)", maxLength: 15, nullable: false),
                    StartingInvoiceNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ClosingInvoiceNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    StartingCreditMemoNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ClosingCreditMemoNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    TotalBankPOS = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalBankTransfer = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalBank = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalCash = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalPendingCash = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    SystemSalesAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    SystemReturnAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Difference = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CashierClosings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CashierClosingDenominations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CashierClosingId = table.Column<int>(type: "int", nullable: false),
                    Denomination = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    LineTotal = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CashierClosingDenominations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CashierClosingDenominations_CashierClosings_CashierClosingId",
                        column: x => x.CashierClosingId,
                        principalTable: "CashierClosings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CashierClosingDocuments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CashierClosingId = table.Column<int>(type: "int", nullable: false),
                    DocumentType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    DocumentNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CustomerNo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    AmountIncVAT = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PostingDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CashierClosingDocuments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CashierClosingDocuments_CashierClosings_CashierClosingId",
                        column: x => x.CashierClosingId,
                        principalTable: "CashierClosings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CashierClosingPendings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CashierClosingId = table.Column<int>(type: "int", nullable: false),
                    EmpId = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    EmpName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    CustomerComments = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CashierClosingPendings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CashierClosingPendings_CashierClosings_CashierClosingId",
                        column: x => x.CashierClosingId,
                        principalTable: "CashierClosings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CashierClosingDenominations_CashierClosingId",
                table: "CashierClosingDenominations",
                column: "CashierClosingId");

            migrationBuilder.CreateIndex(
                name: "IX_CashierClosingDocuments_CashierClosingId",
                table: "CashierClosingDocuments",
                column: "CashierClosingId");

            migrationBuilder.CreateIndex(
                name: "IX_CashierClosingPendings_CashierClosingId",
                table: "CashierClosingPendings",
                column: "CashierClosingId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CashierClosingDenominations");

            migrationBuilder.DropTable(
                name: "CashierClosingDocuments");

            migrationBuilder.DropTable(
                name: "CashierClosingPendings");

            migrationBuilder.DropTable(
                name: "CashierClosings");
        }
    }
}
