IF OBJECT_ID(N'dbo.Assets', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[Assets] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [AssetCode] NVARCHAR(30) NOT NULL,
    [Name] NVARCHAR(200) NOT NULL,
    [Category] NVARCHAR(50) NOT NULL,
    [Subcategory] NVARCHAR(100) NOT NULL,
    [SerialNumber] NVARCHAR(100) NULL,
    [ImeiNumber] NVARCHAR(50) NULL,
    [BrandModel] NVARCHAR(150) NOT NULL,
    [Vendor] NVARCHAR(150) NOT NULL,
    [PurchaseDate] DATE NOT NULL,
    [PurchaseCost] DECIMAL(18, 2) NOT NULL,
    [ExpiryDate] DATE NULL,
    [WarrantyExpiry] DATE NULL,
    [AssignedTo] NVARCHAR(150) NULL,
    [Department] NVARCHAR(100) NOT NULL,
    [Location] NVARCHAR(150) NOT NULL,
    [Status] NVARCHAR(30) NOT NULL,
    [Notes] NVARCHAR(MAX) NULL,
    [CreatedById] INT NULL,
    [UpdatedById] INT NULL,
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_Assets_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_Assets_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [UQ_Assets_AssetCode] UNIQUE ([AssetCode]),
    CONSTRAINT [FK_Assets_CreatedBy] FOREIGN KEY ([CreatedById]) REFERENCES [dbo].[Users]([Id]),
    CONSTRAINT [FK_Assets_UpdatedBy] FOREIGN KEY ([UpdatedById]) REFERENCES [dbo].[Users]([Id])
  );

  CREATE INDEX [IX_Assets_Status] ON [dbo].[Assets] ([Status]);
  CREATE INDEX [IX_Assets_Category] ON [dbo].[Assets] ([Category]);
  CREATE INDEX [IX_Assets_ExpiryDate] ON [dbo].[Assets] ([ExpiryDate]);
  CREATE INDEX [IX_Assets_WarrantyExpiry] ON [dbo].[Assets] ([WarrantyExpiry]);
END

IF COL_LENGTH(N'dbo.Assets', N'SerialNumber') IS NULL
BEGIN
  ALTER TABLE [dbo].[Assets] ADD [SerialNumber] NVARCHAR(100) NULL;
END

IF COL_LENGTH(N'dbo.Assets', N'ImeiNumber') IS NULL
BEGIN
  ALTER TABLE [dbo].[Assets] ADD [ImeiNumber] NVARCHAR(50) NULL;
END

IF EXISTS (
  SELECT 1
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'dbo'
    AND TABLE_NAME = 'Assets'
    AND COLUMN_NAME = 'ExpiryDate'
    AND IS_NULLABLE = 'NO'
)
BEGIN
  ALTER TABLE [dbo].[Assets] ALTER COLUMN [ExpiryDate] DATE NULL;
END

IF EXISTS (
  SELECT 1
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'dbo'
    AND TABLE_NAME = 'Assets'
    AND COLUMN_NAME = 'WarrantyExpiry'
    AND IS_NULLABLE = 'NO'
)
BEGIN
  ALTER TABLE [dbo].[Assets] ALTER COLUMN [WarrantyExpiry] DATE NULL;
END

IF COL_LENGTH(N'dbo.Departments', N'Location') IS NULL
BEGIN
  ALTER TABLE [dbo].[Departments] ADD [Location] NVARCHAR(150) NULL;
END

IF OBJECT_ID(N'dbo.AssetCategories', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[AssetCategories] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [Name] NVARCHAR(100) NOT NULL,
    [Description] NVARCHAR(255) NULL,
    [IsActive] BIT NOT NULL CONSTRAINT [DF_AssetCategories_IsActive] DEFAULT (1),
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_AssetCategories_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_AssetCategories_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [UQ_AssetCategories_Name] UNIQUE ([Name])
  );
END

IF OBJECT_ID(N'dbo.AssetSubcategories', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[AssetSubcategories] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [CategoryId] INT NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [IsActive] BIT NOT NULL CONSTRAINT [DF_AssetSubcategories_IsActive] DEFAULT (1),
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_AssetSubcategories_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_AssetSubcategories_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [FK_AssetSubcategories_Category] FOREIGN KEY ([CategoryId]) REFERENCES [dbo].[AssetCategories]([Id]),
    CONSTRAINT [UQ_AssetSubcategories_Category_Name] UNIQUE ([CategoryId], [Name])
  );

  CREATE INDEX [IX_AssetSubcategories_CategoryId] ON [dbo].[AssetSubcategories] ([CategoryId]);
  CREATE INDEX [IX_AssetSubcategories_IsActive] ON [dbo].[AssetSubcategories] ([IsActive]);
END

IF OBJECT_ID(N'dbo.AssetVendors', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[AssetVendors] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [VendorName] NVARCHAR(150) NOT NULL,
    [ErpVendorCode] NVARCHAR(80) NULL,
    CONSTRAINT [UQ_AssetVendors_VendorName] UNIQUE ([VendorName])
  );
END

IF COL_LENGTH(N'dbo.AssetVendors', N'ErpVendorCode') IS NULL
BEGIN
  ALTER TABLE [dbo].[AssetVendors] ADD [ErpVendorCode] NVARCHAR(80) NULL;
END

IF OBJECT_ID(N'dbo.AssetEmployees', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[AssetEmployees] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [EmployeeCode] NVARCHAR(50) NOT NULL,
    [FullName] NVARCHAR(150) NOT NULL,
    [Email] NVARCHAR(255) NULL,
    [DepartmentId] INT NULL,
    [IsActive] BIT NOT NULL CONSTRAINT [DF_AssetEmployees_IsActive] DEFAULT (1),
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_AssetEmployees_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_AssetEmployees_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [UQ_AssetEmployees_EmployeeCode] UNIQUE ([EmployeeCode]),
    CONSTRAINT [FK_AssetEmployees_Department] FOREIGN KEY ([DepartmentId]) REFERENCES [dbo].[Departments]([Id])
  );

  CREATE INDEX [IX_AssetEmployees_IsActive] ON [dbo].[AssetEmployees] ([IsActive]);
  CREATE INDEX [IX_AssetEmployees_DepartmentId] ON [dbo].[AssetEmployees] ([DepartmentId]);
END

MERGE [dbo].[AssetCategories] AS target
USING (
  VALUES
    (N'Hardware', N'Physical IT devices and equipment'),
    (N'Software', N'Licenses, subscriptions, and installed products'),
    (N'Cloud', N'Cloud platforms and hosted services'),
    (N'Network', N'Connectivity and network infrastructure'),
    (N'Contract', N'Support, warranty, and renewal agreements')
) AS source ([Name], [Description])
ON target.[Name] = source.[Name]
WHEN NOT MATCHED THEN
  INSERT ([Name], [Description], [IsActive]) VALUES (source.[Name], source.[Description], 1);

MERGE [dbo].[AssetSubcategories] AS target
USING (
  SELECT category.[Id] AS [CategoryId], source.[Name]
  FROM [dbo].[AssetCategories] AS category
  INNER JOIN (
    VALUES
      (N'Hardware', N'Laptop'),
      (N'Hardware', N'Desktop'),
      (N'Hardware', N'Printer'),
      (N'Hardware', N'Mobile Device'),
      (N'Software', N'Productivity Suite'),
      (N'Software', N'ERP License'),
      (N'Software', N'Security Software'),
      (N'Cloud', N'Compute Platform'),
      (N'Cloud', N'Storage Service'),
      (N'Cloud', N'Backup Service'),
      (N'Network', N'Switch'),
      (N'Network', N'Firewall'),
      (N'Network', N'Router'),
      (N'Contract', N'Support Renewal'),
      (N'Contract', N'Warranty Extension'),
      (N'Contract', N'Subscription Contract')
  ) AS source ([CategoryName], [Name]) ON source.[CategoryName] = category.[Name]
) AS source
ON target.[CategoryId] = source.[CategoryId] AND target.[Name] = source.[Name]
WHEN NOT MATCHED THEN
  INSERT ([CategoryId], [Name], [IsActive]) VALUES (source.[CategoryId], source.[Name], 1);

IF OBJECT_ID(N'dbo.AssetAssignmentHistory', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[AssetAssignmentHistory] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [AssetId] INT NOT NULL,
    [TransactionDocumentId] INT NULL,
    [Type] NVARCHAR(30) NOT NULL,
    [AssignedTo] NVARCHAR(150) NOT NULL,
    [Department] NVARCHAR(100) NOT NULL,
    [Location] NVARCHAR(150) NOT NULL,
    [AssignedAt] DATETIME2 NOT NULL CONSTRAINT [DF_AssetAssignmentHistory_AssignedAt] DEFAULT (SYSUTCDATETIME()),
    [ReturnedAt] DATETIME2 NULL,
    [Note] NVARCHAR(MAX) NULL,
    [AssignedById] INT NULL,
    [AssignedByName] NVARCHAR(100) NOT NULL,
    [FromAssignedTo] NVARCHAR(150) NULL,
    [FromDepartment] NVARCHAR(100) NULL,
    [FromLocation] NVARCHAR(150) NULL,
    CONSTRAINT [FK_AssetAssignmentHistory_Asset] FOREIGN KEY ([AssetId]) REFERENCES [dbo].[Assets]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_AssetAssignmentHistory_AssignedBy] FOREIGN KEY ([AssignedById]) REFERENCES [dbo].[Users]([Id])
  );

  CREATE INDEX [IX_AssetAssignmentHistory_AssetId_AssignedAt]
    ON [dbo].[AssetAssignmentHistory] ([AssetId], [AssignedAt]);
END

IF OBJECT_ID(N'dbo.AssetTransactionDocuments', N'U') IS NULL
BEGIN
  CREATE TABLE [dbo].[AssetTransactionDocuments] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [TransactionNumber] NVARCHAR(40) NOT NULL,
    [TransactionType] NVARCHAR(30) NOT NULL,
    [TransactionDate] DATETIME2 NOT NULL CONSTRAINT [DF_AssetTransactionDocuments_TransactionDate] DEFAULT (SYSUTCDATETIME()),
    [IssuedTo] NVARCHAR(150) NOT NULL,
    [Department] NVARCHAR(100) NOT NULL,
    [Location] NVARCHAR(150) NOT NULL,
    [ResultingStatus] NVARCHAR(30) NOT NULL,
    [Note] NVARCHAR(MAX) NULL,
    [AssetCount] INT NOT NULL CONSTRAINT [DF_AssetTransactionDocuments_AssetCount] DEFAULT (0),
    [CreatedById] INT NULL,
    [CreatedByName] NVARCHAR(100) NOT NULL,
    [CreatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_AssetTransactionDocuments_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [UQ_AssetTransactionDocuments_TransactionNumber] UNIQUE ([TransactionNumber]),
    CONSTRAINT [FK_AssetTransactionDocuments_CreatedBy] FOREIGN KEY ([CreatedById]) REFERENCES [dbo].[Users]([Id])
  );

  CREATE INDEX [IX_AssetTransactionDocuments_Type_Date]
    ON [dbo].[AssetTransactionDocuments] ([TransactionType], [TransactionDate] DESC);
END

IF COL_LENGTH(N'dbo.AssetAssignmentHistory', N'TransactionDocumentId') IS NULL
BEGIN
  ALTER TABLE [dbo].[AssetAssignmentHistory] ADD [TransactionDocumentId] INT NULL;
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.foreign_keys
  WHERE name = N'FK_AssetAssignmentHistory_TransactionDocument'
)
BEGIN
  ALTER TABLE [dbo].[AssetAssignmentHistory]
  ADD CONSTRAINT [FK_AssetAssignmentHistory_TransactionDocument]
    FOREIGN KEY ([TransactionDocumentId]) REFERENCES [dbo].[AssetTransactionDocuments]([Id]);
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = N'IX_AssetAssignmentHistory_TransactionDocumentId'
    AND object_id = OBJECT_ID(N'dbo.AssetAssignmentHistory')
)
BEGIN
  CREATE INDEX [IX_AssetAssignmentHistory_TransactionDocumentId]
    ON [dbo].[AssetAssignmentHistory] ([TransactionDocumentId]);
END
