IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [Users] (
    [Id] int NOT NULL IDENTITY,
    [Email] nvarchar(max) NOT NULL,
    [PasswordHash] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260312143102_InitialCreate', N'8.0.4');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [VendorSubs] (
    [Id] int NOT NULL IDENTITY,
    [VendorName] nvarchar(max) NOT NULL,
    [DisplayName] nvarchar(max) NOT NULL,
    [NavReferCode] nvarchar(max) NOT NULL,
    [Email] nvarchar(max) NOT NULL,
    [MobileNo] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_VendorSubs] PRIMARY KEY ([Id])
);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260314083655_AddVendorSubTable', N'8.0.4');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [BidHeaders] (
    [BidNo] nvarchar(450) NOT NULL,
    [CreatedDate] datetime2 NOT NULL,
    CONSTRAINT [PK_BidHeaders] PRIMARY KEY ([BidNo])
);
GO

CREATE TABLE [BidLines] (
    [Id] int NOT NULL IDENTITY,
    [BidHNo] nvarchar(450) NOT NULL,
    [NAVDocNo] nvarchar(max) NOT NULL,
    [NAVSku] int NOT NULL,
    [UOM] nvarchar(max) NOT NULL,
    [Quantity] decimal(18,2) NOT NULL,
    CONSTRAINT [PK_BidLines] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_BidLines_BidHeaders_BidHNo] FOREIGN KEY ([BidHNo]) REFERENCES [BidHeaders] ([BidNo]) ON DELETE CASCADE
);
GO

CREATE TABLE [VendorSubPrices] (
    [Id] int NOT NULL IDENTITY,
    [BidLineId] int NOT NULL,
    [VendorId] int NOT NULL,
    [Cost] decimal(18,2) NOT NULL,
    CONSTRAINT [PK_VendorSubPrices] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_VendorSubPrices_BidLines_BidLineId] FOREIGN KEY ([BidLineId]) REFERENCES [BidLines] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_VendorSubPrices_VendorSubs_VendorId] FOREIGN KEY ([VendorId]) REFERENCES [VendorSubs] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_BidLines_BidHNo] ON [BidLines] ([BidHNo]);
GO

CREATE INDEX [IX_VendorSubPrices_BidLineId] ON [VendorSubPrices] ([BidLineId]);
GO

CREATE INDEX [IX_VendorSubPrices_VendorId] ON [VendorSubPrices] ([VendorId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260315094804_AddBiddingSchema', N'8.0.4');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [BidLines] ADD [Description] nvarchar(450) NOT NULL DEFAULT N'';
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260316074238_AddDescriptionToBidLines', N'8.0.4');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [BidHeaders] ADD [Status] nvarchar(50) NOT NULL DEFAULT N'';
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260316083926_AddStatusToBidHeader', N'8.0.4');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [BidItemDistributions] (
    [Id] int NOT NULL IDENTITY,
    [BidHNo] nvarchar(450) NOT NULL,
    [NAVDocNo] nvarchar(max) NULL,
    [NAVSku] int NOT NULL,
    [Qty] decimal(18,2) NOT NULL,
    [Location] nvarchar(100) NULL,
    CONSTRAINT [PK_BidItemDistributions] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_BidItemDistributions_BidHeaders_BidHNo] FOREIGN KEY ([BidHNo]) REFERENCES [BidHeaders] ([BidNo]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_BidItemDistributions_BidHNo] ON [BidItemDistributions] ([BidHNo]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260625105607_AddBidItemDistribution', N'8.0.4');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

-- Add Name, Location, Role columns to Users table (added after initial schema)
ALTER TABLE [Users] ADD [Name] nvarchar(100) NOT NULL DEFAULT N'';
GO

ALTER TABLE [Users] ADD [Location] nvarchar(25) NOT NULL DEFAULT N'';
GO

ALTER TABLE [Users] ADD [Role] nvarchar(20) NOT NULL DEFAULT N'User';
GO

-- Create UserProfiles table
CREATE TABLE [UserProfiles] (
    [Id] int NOT NULL IDENTITY,
    [ProfileName] nvarchar(100) NOT NULL,
    [DashboardPage] nvarchar(100) NOT NULL DEFAULT N'dashboard.html',
    CONSTRAINT [PK_UserProfiles] PRIMARY KEY ([Id])
);
GO

-- Create ProfilePages table (stores allowed page routes per profile)
CREATE TABLE [ProfilePages] (
    [Id] int NOT NULL IDENTITY,
    [ProfileId] int NOT NULL,
    [PagePath] nvarchar(100) NOT NULL,
    CONSTRAINT [PK_ProfilePages] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ProfilePages_UserProfiles_ProfileId] FOREIGN KEY ([ProfileId]) REFERENCES [UserProfiles] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_ProfilePages_ProfileId] ON [ProfilePages] ([ProfileId]);
GO

-- Add ProfileId foreign key to Users table (nullable - null means admin/default access)
ALTER TABLE [Users] ADD [ProfileId] int NULL;
GO

ALTER TABLE [Users] ADD CONSTRAINT [FK_Users_UserProfiles_ProfileId]
    FOREIGN KEY ([ProfileId]) REFERENCES [UserProfiles] ([Id]) ON DELETE SET NULL;
GO

CREATE INDEX [IX_Users_ProfileId] ON [Users] ([ProfileId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260702000001_AddUserProfilesAndPages', N'8.0.4');
GO

COMMIT;
GO

