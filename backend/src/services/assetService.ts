import { prisma } from '../db'

const ensureAssetStatements = [
  `
  ALTER TABLE "Departments"
  ADD COLUMN IF NOT EXISTS "Location" VARCHAR(150)
  `,
  `
  CREATE TABLE IF NOT EXISTS "AssetCategories" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(100) NOT NULL UNIQUE,
    "Description" VARCHAR(255),
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS "AssetSubcategories" (
    "Id" SERIAL PRIMARY KEY,
    "CategoryId" INTEGER NOT NULL REFERENCES "AssetCategories"("Id") ON DELETE RESTRICT,
    "Name" VARCHAR(100) NOT NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UQ_AssetSubcategories_Category_Name" UNIQUE ("CategoryId", "Name")
  )
  `,
  `
  CREATE INDEX IF NOT EXISTS "IX_AssetSubcategories_CategoryId" ON "AssetSubcategories" ("CategoryId")
  `,
  `
  CREATE INDEX IF NOT EXISTS "IX_AssetSubcategories_IsActive" ON "AssetSubcategories" ("IsActive")
  `,
  `
  CREATE TABLE IF NOT EXISTS "AssetVendors" (
    "Id" SERIAL PRIMARY KEY,
    "VendorName" VARCHAR(150) NOT NULL UNIQUE,
    "ErpVendorCode" VARCHAR(80)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS "AssetEmployees" (
    "Id" SERIAL PRIMARY KEY,
    "EmployeeCode" VARCHAR(50) NOT NULL UNIQUE,
    "FullName" VARCHAR(150) NOT NULL,
    "Email" VARCHAR(255),
    "DepartmentId" INTEGER REFERENCES "Departments"("Id") ON DELETE SET NULL,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
  `,
  `
  CREATE INDEX IF NOT EXISTS "IX_AssetEmployees_IsActive" ON "AssetEmployees" ("IsActive")
  `,
  `
  CREATE INDEX IF NOT EXISTS "IX_AssetEmployees_DepartmentId" ON "AssetEmployees" ("DepartmentId")
  `,
  `
  CREATE TABLE IF NOT EXISTS "Assets" (
    "Id" SERIAL PRIMARY KEY,
    "AssetCode" VARCHAR(30) NOT NULL UNIQUE,
    "Name" VARCHAR(200) NOT NULL,
    "Category" VARCHAR(50) NOT NULL,
    "Subcategory" VARCHAR(100) NOT NULL,
    "SerialNumber" VARCHAR(100),
    "ImeiNumber" VARCHAR(50),
    "BrandModel" VARCHAR(150) NOT NULL,
    "Vendor" VARCHAR(150) NOT NULL,
    "PurchaseDate" DATE NOT NULL,
    "PurchaseCost" DECIMAL(18, 2) NOT NULL,
    "ExpiryDate" DATE,
    "WarrantyExpiry" DATE,
    "AssignedTo" VARCHAR(150),
    "Department" VARCHAR(100) NOT NULL,
    "Location" VARCHAR(150) NOT NULL,
    "Status" VARCHAR(30) NOT NULL,
    "Notes" TEXT,
    "CreatedById" INTEGER REFERENCES "Users"("Id") ON DELETE SET NULL,
    "UpdatedById" INTEGER REFERENCES "Users"("Id") ON DELETE SET NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
  `,
  `
  ALTER TABLE "Assets"
  ADD COLUMN IF NOT EXISTS "SerialNumber" VARCHAR(100)
  `,
  `
  ALTER TABLE "Assets"
  ADD COLUMN IF NOT EXISTS "ImeiNumber" VARCHAR(50)
  `,
  `
  ALTER TABLE "Assets"
  ALTER COLUMN "ExpiryDate" DROP NOT NULL
  `,
  `
  ALTER TABLE "Assets"
  ALTER COLUMN "WarrantyExpiry" DROP NOT NULL
  `,
  `
  CREATE INDEX IF NOT EXISTS "IX_Assets_Status" ON "Assets" ("Status")
  `,
  `
  CREATE INDEX IF NOT EXISTS "IX_Assets_Category" ON "Assets" ("Category")
  `,
  `
  CREATE INDEX IF NOT EXISTS "IX_Assets_ExpiryDate" ON "Assets" ("ExpiryDate")
  `,
  `
  CREATE INDEX IF NOT EXISTS "IX_Assets_WarrantyExpiry" ON "Assets" ("WarrantyExpiry")
  `,
  `
  CREATE TABLE IF NOT EXISTS "AssetTransactionDocuments" (
    "Id" SERIAL PRIMARY KEY,
    "TransactionNumber" VARCHAR(40) NOT NULL UNIQUE,
    "TransactionType" VARCHAR(30) NOT NULL,
    "TransactionDate" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "IssuedTo" VARCHAR(150) NOT NULL,
    "Department" VARCHAR(100) NOT NULL,
    "Location" VARCHAR(150) NOT NULL,
    "ResultingStatus" VARCHAR(30) NOT NULL,
    "Note" TEXT,
    "AssetCount" INTEGER NOT NULL DEFAULT 0,
    "CreatedById" INTEGER REFERENCES "Users"("Id") ON DELETE SET NULL,
    "CreatedByName" VARCHAR(100) NOT NULL,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
  `,
  `
  CREATE INDEX IF NOT EXISTS "IX_AssetTransactionDocuments_Type_Date"
    ON "AssetTransactionDocuments" ("TransactionType", "TransactionDate" DESC)
  `,
  `
  CREATE TABLE IF NOT EXISTS "AssetAssignmentHistory" (
    "Id" SERIAL PRIMARY KEY,
    "AssetId" INTEGER NOT NULL REFERENCES "Assets"("Id") ON DELETE CASCADE,
    "Type" VARCHAR(30) NOT NULL,
    "AssignedTo" VARCHAR(150) NOT NULL,
    "Department" VARCHAR(100) NOT NULL,
    "Location" VARCHAR(150) NOT NULL,
    "AssignedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ReturnedAt" TIMESTAMPTZ,
    "Note" TEXT,
    "TransactionDocumentId" INTEGER REFERENCES "AssetTransactionDocuments"("Id") ON DELETE SET NULL,
    "AssignedById" INTEGER REFERENCES "Users"("Id") ON DELETE SET NULL,
    "AssignedByName" VARCHAR(100) NOT NULL,
    "FromAssignedTo" VARCHAR(150),
    "FromDepartment" VARCHAR(100),
    "FromLocation" VARCHAR(150)
  )
  `,
  `
  ALTER TABLE "AssetAssignmentHistory"
  ADD COLUMN IF NOT EXISTS "TransactionDocumentId" INTEGER
  `,
  `
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'FK_AssetAssignmentHistory_TransactionDocument'
    ) THEN
      ALTER TABLE "AssetAssignmentHistory"
      ADD CONSTRAINT "FK_AssetAssignmentHistory_TransactionDocument"
      FOREIGN KEY ("TransactionDocumentId") REFERENCES "AssetTransactionDocuments"("Id") ON DELETE SET NULL;
    END IF;
  END $$;
  `,
  `
  CREATE INDEX IF NOT EXISTS "IX_AssetAssignmentHistory_AssetId_AssignedAt"
    ON "AssetAssignmentHistory" ("AssetId", "AssignedAt")
  `,
  `
  CREATE INDEX IF NOT EXISTS "IX_AssetAssignmentHistory_TransactionDocumentId"
    ON "AssetAssignmentHistory" ("TransactionDocumentId")
  `,
  `
  INSERT INTO "AssetCategories" ("Name", "Description", "IsActive")
  VALUES
    ('Hardware', 'Physical IT devices and equipment', TRUE),
    ('Software', 'Licenses, subscriptions, and installed products', TRUE),
    ('Cloud', 'Cloud platforms and hosted services', TRUE),
    ('Network', 'Connectivity and network infrastructure', TRUE),
    ('Contract', 'Support, warranty, and renewal agreements', TRUE)
  ON CONFLICT ("Name") DO NOTHING
  `,
  `
  INSERT INTO "AssetSubcategories" ("CategoryId", "Name", "IsActive")
  SELECT category."Id", source."Name", TRUE
  FROM "AssetCategories" AS category
  INNER JOIN (
    VALUES
      ('Hardware', 'Laptop'),
      ('Hardware', 'Desktop'),
      ('Hardware', 'Printer'),
      ('Hardware', 'Mobile Device'),
      ('Software', 'Productivity Suite'),
      ('Software', 'ERP License'),
      ('Software', 'Security Software'),
      ('Cloud', 'Compute Platform'),
      ('Cloud', 'Storage Service'),
      ('Cloud', 'Backup Service'),
      ('Network', 'Switch'),
      ('Network', 'Firewall'),
      ('Network', 'Router'),
      ('Contract', 'Support Renewal'),
      ('Contract', 'Warranty Extension'),
      ('Contract', 'Subscription Contract')
  ) AS source("CategoryName", "Name") ON source."CategoryName" = category."Name"
  ON CONFLICT ("CategoryId", "Name") DO NOTHING
  `,
]

const formatDateOnly = (value: Date | null | undefined) => (value ? value.toISOString().slice(0, 10) : null)

export const parseDateOnly = (value: string, fieldLabel: string) => {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldLabel} must be a valid date`)
  }
  return parsed
}

export const normalizeNullableText = (value: unknown) => {
  const normalized = String(value ?? '').trim()
  return normalized ? normalized : null
}

export const ensureAssetTables = async () => {
  for (const statement of ensureAssetStatements) {
    await prisma.$executeRawUnsafe(statement)
  }
}

export const isAssetManager = (role?: string) => role === 'admin' || role === 'it_staff'

export const formatAssetHistory = (entry: any) => ({
  id: entry.Id,
  transactionDocumentId: entry.TransactionDocumentId ? String(entry.TransactionDocumentId) : undefined,
  type: entry.Type,
  assignedTo: entry.AssignedTo,
  department: entry.Department,
  location: entry.Location,
  assignedAt: entry.AssignedAt ? new Date(entry.AssignedAt).toISOString() : '',
  returnedAt: formatDateOnly(entry.ReturnedAt),
  note: entry.Note || '',
  assignedBy: entry.AssignedByName || entry.RecordedBy?.FullName || 'System',
  fromAssignedTo: entry.FromAssignedTo || undefined,
  fromDepartment: entry.FromDepartment || undefined,
  fromLocation: entry.FromLocation || undefined,
})

export const formatAsset = (asset: any) => ({
  id: asset.AssetCode,
  name: asset.Name,
  category: asset.Category,
  subcategory: asset.Subcategory,
  serialNumber: asset.SerialNumber || '',
  imeiNumber: asset.ImeiNumber || '',
  brandModel: asset.BrandModel,
  vendor: asset.Vendor,
  purchaseDate: formatDateOnly(asset.PurchaseDate) || '',
  purchaseCost: Number(asset.PurchaseCost),
  expiryDate: formatDateOnly(asset.ExpiryDate) || '',
  warrantyExpiry: formatDateOnly(asset.WarrantyExpiry) || '',
  assignedTo: asset.AssignedTo || '',
  department: asset.Department,
  location: asset.Location,
  status: asset.Status,
  notes: asset.Notes || '',
  assignmentHistory: (asset.AssignmentHistory || [])
    .slice()
    .sort((left: any, right: any) => right.AssignedAt.getTime() - left.AssignedAt.getTime())
    .map(formatAssetHistory),
})
