import { Prisma } from '@prisma/client'
import { Response, Router } from 'express'
import { prisma } from '../db'
import { authenticate, AuthRequest } from '../middleware/auth'
import {
  ensureAssetTables,
  formatAsset,
  isAssetManager,
  normalizeNullableText,
  parseDateOnly,
} from '../services/assetService'

const router = Router()

const assetStatuses = ['In Stock', 'Assigned', 'In Use', 'Maintenance', 'Retired'] as const
const transactionTypes = ['issue', 'return', 'transfer'] as const

type SqlRunner = Pick<typeof prisma, '$executeRaw' | '$queryRaw'>

interface AssetRow {
  Id: number
  AssetCode: string
  Name: string
  Category: string
  Subcategory: string
  SerialNumber: string | null
  ImeiNumber: string | null
  BrandModel: string
  Vendor: string
  PurchaseDate: Date
  PurchaseCost: Prisma.Decimal | number | string
  ExpiryDate: Date | null
  WarrantyExpiry: Date | null
  AssignedTo: string | null
  Department: string
  Location: string
  Status: string
  Notes: string | null
  CreatedById: number | null
  UpdatedById: number | null
  CreatedAt: Date
  UpdatedAt: Date
}

interface AssetHistoryRow {
  Id: number
  AssetId: number
  TransactionDocumentId: number | null
  Type: string
  AssignedTo: string
  Department: string
  Location: string
  AssignedAt: Date
  ReturnedAt: Date | null
  Note: string | null
  AssignedById: number | null
  AssignedByName: string
  FromAssignedTo: string | null
  FromDepartment: string | null
  FromLocation: string | null
  RecordedByFullName: string | null
}

interface AssetTransactionDocumentRow {
  Id: number
  TransactionNumber: string
  TransactionType: string
  TransactionDate: Date
  IssuedTo: string
  Department: string
  Location: string
  ResultingStatus: string
  Note: string | null
  AssetCount: number
  CreatedById: number | null
  CreatedByName: string
  CreatedAt: Date
}

interface AssetTransactionDocumentLineRow {
  HistoryId: number
  TransactionDocumentId: number
  TransactionNumber: string
  TransactionType: string
  TransactionDate: Date
  AssetCode: string
  AssetName: string
  AssignedTo: string
  Department: string
  Location: string
  AssignedAt: Date
  Note: string | null
  AssignedByName: string
  FromAssignedTo: string | null
  FromDepartment: string | null
  FromLocation: string | null
}

interface DepartmentMasterRow {
  Id: number
  Name: string
  Location: string | null
}

interface AssetCategoryMasterRow {
  Id: number
  Name: string
  Description: string | null
  IsActive: boolean | number
  AssetCount?: number
  SubcategoryCount?: number
}

interface AssetSubcategoryMasterRow {
  Id: number
  CategoryId: number
  CategoryName: string
  Name: string
  IsActive: boolean | number
  AssetCount?: number
}

interface AssetVendorRow {
  Id: number
  VendorName: string
  ErpVendorCode: string | null
  AssetCount?: number
}

interface AssetEmployeeRow {
  Id: number
  EmployeeCode: string
  FullName: string
  Email: string | null
  DepartmentId: number | null
  DepartmentName: string | null
  DepartmentLocation: string | null
  IsActive: boolean | number
  CreatedAt: Date
  UpdatedAt: Date
}

interface HydratedAssetRow extends AssetRow {
  AssignmentHistory: AssetHistoryRow[]
}

interface AssetPayload {
  Name: string
  Category: string
  Subcategory: string
  SerialNumber: string | null
  ImeiNumber: string | null
  BrandModel: string
  Vendor: string
  PurchaseDate: Date
  PurchaseCost: Prisma.Decimal
  ExpiryDate: Date | null
  WarrantyExpiry: Date | null
  AssignedTo: string | null
  Department: string
  Location: string
  Status: string
  Notes: string | null
}

interface AssetCategoryPayload {
  Name: string
  Description: string | null
  IsActive: boolean
}

interface AssetSubcategoryPayload {
  CategoryId: number
  Name: string
  IsActive: boolean
}

interface AssetVendorPayload {
  VendorName: string
  ErpVendorCode: string | null
}

interface TransactionPayload {
  type: (typeof transactionTypes)[number]
  assignedTo: string | null
  department: string
  location: string
  status: string
  note: string | null
}

interface AssetEmployeePayload {
  EmployeeCode: string
  FullName: string
  Email: string | null
  DepartmentId: number
}

interface HistoryInsertInput {
  assetId: number
  transactionDocumentId?: number | null
  type: 'Issue' | 'Return' | 'Transfer'
  assignedTo: string
  department: string
  location: string
  assignedAt: Date
  returnedAt?: Date | null
  note: string | null
  actorUserId: number
  actorName: string
  fromAssignedTo?: string | null
  fromDepartment?: string | null
  fromLocation?: string | null
}

interface BatchTransactionPayload extends TransactionPayload {
  assetCodes: string[]
}

class AssetValidationError extends Error {}

class AssetNotFoundError extends Error {
  constructor() {
    super('Asset not found')
  }
}

let assetTablesReadyPromise: Promise<void> | null = null

const assetColumnSelect = Prisma.sql`
  "Id",
  "AssetCode",
  "Name",
  "Category",
  "Subcategory",
  "SerialNumber",
  "ImeiNumber",
  "BrandModel",
  "Vendor",
  "PurchaseDate",
  "PurchaseCost",
  "ExpiryDate",
  "WarrantyExpiry",
  "AssignedTo",
  "Department",
  "Location",
  "Status",
  "Notes",
  "CreatedById",
  "UpdatedById",
  "CreatedAt",
  "UpdatedAt"
`

const ensureAssetTablesReady = async () => {
  if (!assetTablesReadyPromise) {
    assetTablesReadyPromise = ensureAssetTables().catch((error) => {
      assetTablesReadyPromise = null
      throw error
    })
  }

  await assetTablesReadyPromise
}

const ensureAssetManagerAccess = async (req: AuthRequest, res: Response): Promise<boolean> => {
  if (!isAssetManager(req.user?.role)) {
    res.status(403).json({ error: 'Forbidden. IT asset access requires admin or IT staff privileges.' })
    return false
  }

  return true
}

const ensureAssetAdminAccess = async (req: AuthRequest, res: Response): Promise<boolean> => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden. Admin access required for asset masters.' })
    return false
  }

  return true
}

const getActorName = (req: AuthRequest) => `${req.user?.first_name ?? ''} ${req.user?.last_name ?? ''}`.trim() || 'System'

const getActorUserId = (req: AuthRequest) => {
  const actorId = Number(req.user?.id)
  if (!Number.isInteger(actorId) || actorId <= 0) {
    throw new AssetValidationError('Authenticated user context is missing.')
  }

  return actorId
}

const toSqlDateValue = (value: Date | null) => (value ? Prisma.sql`${value}` : Prisma.sql`CAST(NULL AS DATE)`)
const toSqlDateTimeValue = (value: Date | null | undefined) =>
  value ? Prisma.sql`${value}` : Prisma.sql`CAST(NULL AS TIMESTAMP)`

const getErrorResponse = (error: unknown, fallbackMessage: string) => {
  if (error instanceof AssetNotFoundError) {
    return { statusCode: 404, message: error.message }
  }

  if (error instanceof AssetValidationError) {
    return { statusCode: 400, message: error.message }
  }

  return { statusCode: 500, message: fallbackMessage }
}

const getLatestAssetCode = async (runner: SqlRunner) => {
  const rows = await runner.$queryRaw<Array<{ AssetCode: string }>>(Prisma.sql`
    SELECT "AssetCode"
    FROM "Assets"
    ORDER BY "Id" DESC
    LIMIT 1
  `)

  return rows[0]?.AssetCode ?? null
}

const getLatestTransactionNumber = async (runner: SqlRunner) => {
  const rows = await runner.$queryRaw<Array<{ TransactionNumber: string }>>(Prisma.sql`
    SELECT "TransactionNumber"
    FROM "AssetTransactionDocuments"
    ORDER BY "Id" DESC
    LIMIT 1
  `)

  return rows[0]?.TransactionNumber ?? null
}

const toNextTransactionNumber = async (runner: SqlRunner) => {
  const latestNumber = await getLatestTransactionNumber(runner)
  const currentNumber = latestNumber ? Number(String(latestNumber).replace('ATX-', '')) : 0
  const nextNumber = Number.isNaN(currentNumber) ? 1 : currentNumber + 1
  return `ATX-${String(nextNumber).padStart(6, '0')}`
}

const toNextAssetCode = async (runner: SqlRunner) => {
  const latestCode = await getLatestAssetCode(runner)
  const currentNumber = latestCode ? Number(String(latestCode).replace('AST-', '')) : 0
  const nextNumber = Number.isNaN(currentNumber) ? 1 : currentNumber + 1
  return `AST-${String(nextNumber).padStart(3, '0')}`
}

const getDepartmentRows = async (runner: SqlRunner) =>
  runner.$queryRaw<DepartmentMasterRow[]>(Prisma.sql`
    SELECT "Id", "Name", "Location"
    FROM "Departments"
    WHERE "IsActive" = TRUE
    ORDER BY "Name" ASC
  `)

const getAssetCategoryRows = async (runner: SqlRunner, includeInactive = false) => {
  const activeClause = includeInactive ? Prisma.empty : Prisma.sql`WHERE category."IsActive" = TRUE`

  return runner.$queryRaw<AssetCategoryMasterRow[]>(Prisma.sql`
    SELECT
      category."Id",
      category."Name",
      category."Description",
      category."IsActive",
      (
        SELECT COUNT(*)
        FROM "Assets" asset
        WHERE asset."Category" = category."Name"
      ) AS "AssetCount",
      (
        SELECT COUNT(*)
        FROM "AssetSubcategories" subcategory
        WHERE subcategory."CategoryId" = category."Id"
          AND subcategory."IsActive" = TRUE
      ) AS "SubcategoryCount"
    FROM "AssetCategories" AS category
    ${activeClause}
    ORDER BY category."Name" ASC
  `)
}

const getAssetSubcategoryRows = async (runner: SqlRunner, includeInactive = false) => {
  const activeClause = includeInactive ? Prisma.empty : Prisma.sql`WHERE subcategory."IsActive" = TRUE`

  return runner.$queryRaw<AssetSubcategoryMasterRow[]>(Prisma.sql`
    SELECT
      subcategory."Id",
      subcategory."CategoryId",
      category."Name" AS "CategoryName",
      subcategory."Name",
      subcategory."IsActive",
      (
        SELECT COUNT(*)
        FROM "Assets" asset
        WHERE asset."Category" = category."Name"
          AND asset."Subcategory" = subcategory."Name"
      ) AS "AssetCount"
    FROM "AssetSubcategories" AS subcategory
    INNER JOIN "AssetCategories" AS category ON category."Id" = subcategory."CategoryId"
    ${activeClause}
    ORDER BY category."Name" ASC, subcategory."Name" ASC
  `)
}

const getAssetCategoryById = async (runner: SqlRunner, categoryId: number) => {
  const rows = await runner.$queryRaw<AssetCategoryMasterRow[]>(Prisma.sql`
    SELECT
      category."Id",
      category."Name",
      category."Description",
      category."IsActive",
      (
        SELECT COUNT(*)
        FROM "Assets" asset
        WHERE asset."Category" = category."Name"
      ) AS "AssetCount",
      (
        SELECT COUNT(*)
        FROM "AssetSubcategories" subcategory
        WHERE subcategory."CategoryId" = category."Id"
          AND subcategory."IsActive" = TRUE
      ) AS "SubcategoryCount"
    FROM "AssetCategories" AS category
    WHERE category."Id" = ${categoryId}
  `)

  return rows[0] ?? null
}

const getAssetSubcategoryById = async (runner: SqlRunner, subcategoryId: number) => {
  const rows = await runner.$queryRaw<AssetSubcategoryMasterRow[]>(Prisma.sql`
    SELECT
      subcategory."Id",
      subcategory."CategoryId",
      category."Name" AS "CategoryName",
      subcategory."Name",
      subcategory."IsActive",
      (
        SELECT COUNT(*)
        FROM "Assets" asset
        WHERE asset."Category" = category."Name"
          AND asset."Subcategory" = subcategory."Name"
      ) AS "AssetCount"
    FROM "AssetSubcategories" AS subcategory
    INNER JOIN "AssetCategories" AS category ON category."Id" = subcategory."CategoryId"
    WHERE subcategory."Id" = ${subcategoryId}
  `)

  return rows[0] ?? null
}

const getAssetVendorRows = async (runner: SqlRunner) =>
  runner.$queryRaw<AssetVendorRow[]>(Prisma.sql`
    SELECT
      vendor."Id",
      vendor."VendorName",
      vendor."ErpVendorCode",
      (
        SELECT COUNT(*)
        FROM "Assets" asset
        WHERE asset."Vendor" = vendor."VendorName"
      ) AS "AssetCount"
    FROM "AssetVendors" AS vendor
    ORDER BY vendor."VendorName" ASC
  `)

const getAssetVendorById = async (runner: SqlRunner, vendorId: number) => {
  const rows = await runner.$queryRaw<AssetVendorRow[]>(Prisma.sql`
    SELECT
      vendor."Id",
      vendor."VendorName",
      vendor."ErpVendorCode",
      (
        SELECT COUNT(*)
        FROM "Assets" asset
        WHERE asset."Vendor" = vendor."VendorName"
      ) AS "AssetCount"
    FROM "AssetVendors" AS vendor
    WHERE vendor."Id" = ${vendorId}
  `)

  return rows[0] ?? null
}

const getAssetEmployeeRows = async (runner: SqlRunner, includeInactive = false) => {
  const activeClause = includeInactive ? Prisma.empty : Prisma.sql`WHERE employee."IsActive" = TRUE`

  return runner.$queryRaw<AssetEmployeeRow[]>(Prisma.sql`
    SELECT
      employee."Id",
      employee."EmployeeCode",
      employee."FullName",
      employee."Email",
      employee."DepartmentId",
      department."Name" AS "DepartmentName",
      department."Location" AS "DepartmentLocation",
      employee."IsActive",
      employee."CreatedAt",
      employee."UpdatedAt"
    FROM "AssetEmployees" AS employee
    LEFT JOIN "Departments" AS department ON department."Id" = employee."DepartmentId"
    ${activeClause}
    ORDER BY employee."FullName" ASC
  `)
}

const getAssetEmployeeById = async (runner: SqlRunner, employeeId: number) => {
  const rows = await runner.$queryRaw<AssetEmployeeRow[]>(Prisma.sql`
    SELECT
      employee."Id",
      employee."EmployeeCode",
      employee."FullName",
      employee."Email",
      employee."DepartmentId",
      department."Name" AS "DepartmentName",
      department."Location" AS "DepartmentLocation",
      employee."IsActive",
      employee."CreatedAt",
      employee."UpdatedAt"
    FROM "AssetEmployees" AS employee
    LEFT JOIN "Departments" AS department ON department."Id" = employee."DepartmentId"
    WHERE employee."Id" = ${employeeId}
  `)

  return rows[0] ?? null
}

const formatAssetEmployee = (row: AssetEmployeeRow) => ({
  id: row.Id,
  employeeCode: row.EmployeeCode,
  name: row.FullName,
  email: row.Email || '',
  departmentId: row.DepartmentId,
  department: row.DepartmentName || '',
  location: row.DepartmentLocation || '',
  isActive: Boolean(row.IsActive),
})

const formatAssetCategory = (row: AssetCategoryMasterRow) => ({
  id: row.Id,
  name: row.Name,
  description: row.Description || '',
  isActive: Boolean(row.IsActive),
  assetCount: Number(row.AssetCount || 0),
  subcategoryCount: Number(row.SubcategoryCount || 0),
})

const formatAssetSubcategory = (row: AssetSubcategoryMasterRow) => ({
  id: row.Id,
  categoryId: row.CategoryId,
  categoryName: row.CategoryName,
  name: row.Name,
  isActive: Boolean(row.IsActive),
  assetCount: Number(row.AssetCount || 0),
})

const formatAssetVendor = (row: AssetVendorRow) => ({
  id: row.Id,
  vendorName: row.VendorName,
  erpVendorCode: row.ErpVendorCode || '',
  assetCount: Number(row.AssetCount || 0),
})

const getAssetRows = async (
  runner: SqlRunner,
  filters: { search?: string; category?: string; status?: string } = {}
) => {
  const clauses: Prisma.Sql[] = []

  if (filters.category) {
    clauses.push(Prisma.sql`"Category" = ${filters.category}`)
  }

  if (filters.status) {
    clauses.push(Prisma.sql`"Status" = ${filters.status}`)
  }

  if (filters.search) {
    const searchValue = `%${filters.search}%`
    clauses.push(Prisma.sql`
      (
        "AssetCode" ILIKE ${searchValue}
        OR "Name" ILIKE ${searchValue}
        OR "SerialNumber" ILIKE ${searchValue}
        OR "ImeiNumber" ILIKE ${searchValue}
        OR "Vendor" ILIKE ${searchValue}
        OR "AssignedTo" ILIKE ${searchValue}
        OR "Department" ILIKE ${searchValue}
        OR "Location" ILIKE ${searchValue}
      )
    `)
  }

  const whereClause = clauses.length > 0 ? Prisma.sql`WHERE ${Prisma.join(clauses, ' AND ')}` : Prisma.empty

  return runner.$queryRaw<AssetRow[]>(Prisma.sql`
    SELECT ${assetColumnSelect}
    FROM "Assets"
    ${whereClause}
    ORDER BY "UpdatedAt" DESC, "Id" DESC
  `)
}

const getAssetRowByCode = async (runner: SqlRunner, assetCode: string) => {
  const rows = await runner.$queryRaw<AssetRow[]>(Prisma.sql`
    SELECT ${assetColumnSelect}
    FROM "Assets"
    WHERE "AssetCode" = ${assetCode}
  `)

  return rows[0] ?? null
}

const getAssetRowsByCodes = async (runner: SqlRunner, assetCodes: string[]) => {
  if (assetCodes.length === 0) {
    return [] as AssetRow[]
  }

  return runner.$queryRaw<AssetRow[]>(Prisma.sql`
    SELECT ${assetColumnSelect}
    FROM "Assets"
    WHERE "AssetCode" IN (${Prisma.join(assetCodes)})
    ORDER BY "AssetCode" ASC
  `)
}

const getAssetHistoryRows = async (runner: SqlRunner, assetIds: number[]) => {
  if (assetIds.length === 0) {
    return [] as AssetHistoryRow[]
  }

  return runner.$queryRaw<AssetHistoryRow[]>(Prisma.sql`
    SELECT
      history."Id",
      history."AssetId",
      history."TransactionDocumentId",
      history."Type",
      history."AssignedTo",
      history."Department",
      history."Location",
      history."AssignedAt",
      history."ReturnedAt",
      history."Note",
      history."AssignedById",
      history."AssignedByName",
      history."FromAssignedTo",
      history."FromDepartment",
      history."FromLocation",
      users."FullName" AS "RecordedByFullName"
    FROM "AssetAssignmentHistory" AS history
    LEFT JOIN "Users" AS users ON users."Id" = history."AssignedById"
    WHERE history."AssetId" IN (${Prisma.join(assetIds)})
    ORDER BY history."AssignedAt" DESC, history."Id" DESC
  `)
}

const hydrateAssets = async (runner: SqlRunner, rows: AssetRow[]) => {
  if (rows.length === 0) {
    return []
  }

  const histories = await getAssetHistoryRows(
    runner,
    rows.map((row) => row.Id)
  )

  const historiesByAssetId = new Map<number, AssetHistoryRow[]>()
  for (const history of histories) {
    const entries = historiesByAssetId.get(history.AssetId) ?? []
    entries.push(history)
    historiesByAssetId.set(history.AssetId, entries)
  }

  return rows.map((row) =>
    formatAsset({
      ...row,
      AssignmentHistory: historiesByAssetId.get(row.Id) ?? [],
    } satisfies HydratedAssetRow)
  )
}

const getHydratedAssetByCode = async (runner: SqlRunner, assetCode: string) => {
  const asset = await getAssetRowByCode(runner, assetCode)
  if (!asset) {
    return null
  }

  const hydrated = await hydrateAssets(runner, [asset])
  return hydrated[0] ?? null
}

const validateAssetPayload = async (payload: unknown): Promise<AssetPayload> => {
  const record = (payload ?? {}) as Record<string, unknown>
  const normalized = {
    name: String(record.name ?? '').trim(),
    category: String(record.category ?? '').trim(),
    subcategory: String(record.subcategory ?? '').trim(),
    serialNumber: normalizeNullableText(record.serialNumber),
    imeiNumber: normalizeNullableText(record.imeiNumber),
    brandModel: String(record.brandModel ?? '').trim(),
    vendor: String(record.vendor ?? '').trim(),
    purchaseDate: String(record.purchaseDate ?? '').trim(),
    purchaseCost: String(record.purchaseCost ?? '').trim(),
    expiryDate: String(record.expiryDate ?? '').trim(),
    warrantyExpiry: String(record.warrantyExpiry ?? '').trim(),
    assignedTo: normalizeNullableText(record.assignedTo),
    department: String(record.department ?? '').trim(),
    location: String(record.location ?? '').trim(),
    status: String(record.status ?? '').trim(),
    notes: String(record.notes ?? '').trim() || null,
  }

  if (!normalized.name) throw new AssetValidationError('Asset name is required.')
  if (!normalized.category) throw new AssetValidationError('Asset category is required.')
  if (!normalized.subcategory) throw new AssetValidationError('Subcategory is required.')
  if (!normalized.brandModel) throw new AssetValidationError('Brand / model is required.')
  if (!normalized.vendor) throw new AssetValidationError('Vendor is required.')
  if (!normalized.purchaseDate) throw new AssetValidationError('Purchase date is required.')
  if (!normalized.purchaseCost || Number.isNaN(Number(normalized.purchaseCost)) || Number(normalized.purchaseCost) <= 0) {
    throw new AssetValidationError('Purchase cost must be greater than zero.')
  }
  if (!normalized.department) throw new AssetValidationError('Department is required.')
  if (!normalized.location) throw new AssetValidationError('Location is required.')
  if (!assetStatuses.includes(normalized.status as (typeof assetStatuses)[number])) {
    throw new AssetValidationError('Asset status is invalid.')
  }
  if ((normalized.status === 'Assigned' || normalized.status === 'In Use') && !normalized.assignedTo) {
    throw new AssetValidationError('Assigned user is required when the asset is allocated.')
  }

  let purchaseDate: Date
  let expiryDate: Date | null = null
  let warrantyExpiry: Date | null = null

  try {
    purchaseDate = parseDateOnly(normalized.purchaseDate, 'Purchase date')
    if (normalized.expiryDate) {
      expiryDate = parseDateOnly(normalized.expiryDate, 'Expiry date')
    }
    if (normalized.warrantyExpiry) {
      warrantyExpiry = parseDateOnly(normalized.warrantyExpiry, 'Warranty expiry')
    }
  } catch (error) {
    throw new AssetValidationError(error instanceof Error ? error.message : 'Asset dates are invalid.')
  }

  if (expiryDate && expiryDate < purchaseDate) {
    throw new AssetValidationError('Expiry date cannot be earlier than purchase date.')
  }

  if (warrantyExpiry && warrantyExpiry < purchaseDate) {
    throw new AssetValidationError('Warranty expiry cannot be earlier than purchase date.')
  }

  const [categoryRows, subcategoryRows] = await Promise.all([
    prisma.$queryRaw<Array<{ Id: number }>>(Prisma.sql`
      SELECT "Id"
      FROM "AssetCategories"
      WHERE "Name" = ${normalized.category}
        AND "IsActive" = TRUE
      LIMIT 1
    `),
    prisma.$queryRaw<Array<{ Id: number }>>(Prisma.sql`
      SELECT subcategory."Id"
      FROM "AssetSubcategories" AS subcategory
      INNER JOIN "AssetCategories" AS category ON category."Id" = subcategory."CategoryId"
      WHERE subcategory."Name" = ${normalized.subcategory}
        AND subcategory."IsActive" = TRUE
        AND category."Name" = ${normalized.category}
        AND category."IsActive" = TRUE
      LIMIT 1
    `),
  ])

  if (!categoryRows[0]?.Id) {
    throw new AssetValidationError('Asset category is invalid.')
  }

  if (!subcategoryRows[0]?.Id) {
    throw new AssetValidationError('Subcategory is invalid for the selected asset category.')
  }

  return {
    Name: normalized.name,
    Category: normalized.category,
    Subcategory: normalized.subcategory,
    SerialNumber: normalized.serialNumber,
    ImeiNumber: normalized.imeiNumber,
    BrandModel: normalized.brandModel,
    Vendor: normalized.vendor,
    PurchaseDate: purchaseDate,
    PurchaseCost: new Prisma.Decimal(normalized.purchaseCost),
    ExpiryDate: expiryDate,
    WarrantyExpiry: warrantyExpiry,
    AssignedTo: normalized.assignedTo,
    Department: normalized.department,
    Location: normalized.location,
    Status: normalized.status,
    Notes: normalized.notes,
  }
}

const validateAssetCategoryPayload = (payload: unknown): AssetCategoryPayload => {
  const record = (payload ?? {}) as Record<string, unknown>
  const name = String(record.name ?? '').trim()
  const description = String(record.description ?? '').trim() || null
  const isActive = record.isActive === undefined ? true : Boolean(record.isActive)

  if (!name) {
    throw new AssetValidationError('Asset category name is required.')
  }

  return {
    Name: name,
    Description: description,
    IsActive: isActive,
  }
}

const validateAssetSubcategoryPayload = async (payload: unknown): Promise<AssetSubcategoryPayload> => {
  const record = (payload ?? {}) as Record<string, unknown>
  const categoryId = Number(record.categoryId)
  const name = String(record.name ?? '').trim()
  const isActive = record.isActive === undefined ? true : Boolean(record.isActive)

  if (!Number.isInteger(categoryId) || categoryId < 1) {
    throw new AssetValidationError('A parent asset category must be selected.')
  }

  if (!name) {
    throw new AssetValidationError('Asset subcategory name is required.')
  }

  const category = await prisma.$queryRaw<Array<{ Id: number }>>(Prisma.sql`
    SELECT "Id"
    FROM "AssetCategories"
    WHERE "Id" = ${categoryId}
      AND "IsActive" = TRUE
    LIMIT 1
  `)

  if (!category[0]?.Id) {
    throw new AssetValidationError('Selected asset category is invalid.')
  }

  return {
    CategoryId: categoryId,
    Name: name,
    IsActive: isActive,
  }
}

const validateAssetVendorPayload = (payload: unknown): AssetVendorPayload => {
  const record = (payload ?? {}) as Record<string, unknown>
  const vendorName = String(record.vendorName ?? '').trim()
  const erpVendorCode = normalizeNullableText(record.erpVendorCode)

  if (!vendorName) {
    throw new AssetValidationError('Vendor name is required.')
  }

  return {
    VendorName: vendorName,
    ErpVendorCode: erpVendorCode,
  }
}

const validateTransactionPayload = (
  payload: unknown,
  currentAssignedTo?: string | null,
  options?: { skipCurrentOwnerChecks?: boolean }
): TransactionPayload => {
  const record = (payload ?? {}) as Record<string, unknown>
  const type = String(record.type ?? '').trim().toLowerCase()
  const assignedTo = normalizeNullableText(record.assignedTo)
  const department = String(record.department ?? '').trim()
  const location = String(record.location ?? '').trim()
  const status = String(record.status ?? '').trim()
  const note = String(record.note ?? '').trim() || null

  if (!transactionTypes.includes(type as (typeof transactionTypes)[number])) {
    throw new AssetValidationError('Transaction type is invalid.')
  }
  if (!department) throw new AssetValidationError('Department is required.')
  if (!location) throw new AssetValidationError('Location is required.')
  if (!assetStatuses.includes(status as (typeof assetStatuses)[number])) {
    throw new AssetValidationError('Resulting asset status is invalid.')
  }

  const allowedStatusesByType: Record<(typeof transactionTypes)[number], string[]> = {
    issue: ['Assigned', 'In Use'],
    return: ['In Stock', 'Maintenance', 'Retired'],
    transfer: ['Assigned', 'In Use', 'Maintenance'],
  }

  if (!allowedStatusesByType[type as (typeof transactionTypes)[number]].includes(status)) {
    throw new AssetValidationError('Resulting status is not valid for this transaction type.')
  }
  if (type !== 'return' && !assignedTo) {
    throw new AssetValidationError('Assignee is required for issue and transfer transactions.')
  }
  if (type === 'return' && !options?.skipCurrentOwnerChecks && !currentAssignedTo) {
    throw new AssetValidationError('This asset is already unassigned. Use issue to allocate it instead.')
  }
  if (type === 'transfer' && !options?.skipCurrentOwnerChecks && !currentAssignedTo) {
    throw new AssetValidationError('Transfer requires an asset that is currently assigned.')
  }

  return {
    type: type as (typeof transactionTypes)[number],
    assignedTo,
    department,
    location,
    status,
    note,
  }
}

const validateBatchTransactionPayload = (payload: unknown): BatchTransactionPayload => {
  const record = (payload ?? {}) as Record<string, unknown>
  const assetCodes = Array.isArray(record.assetCodes)
    ? record.assetCodes.map((value) => String(value ?? '').trim()).filter(Boolean)
    : []

  if (assetCodes.length === 0) {
    throw new AssetValidationError('Select at least one asset for this transaction.')
  }

  const transaction = validateTransactionPayload(record, undefined, { skipCurrentOwnerChecks: true })

  if (transaction.type === 'return') {
    throw new AssetValidationError('Batch transaction documents are only supported for issue and transfer.')
  }

  return {
    ...transaction,
    assetCodes: Array.from(new Set(assetCodes)),
  }
}

const validateAssetEmployeePayload = async (payload: unknown): Promise<AssetEmployeePayload> => {
  const record = (payload ?? {}) as Record<string, unknown>
  const employeeCode = String(record.employeeCode ?? '').trim()
  const fullName = String(record.name ?? '').trim()
  const email = String(record.email ?? '').trim() || null
  const departmentId = Number(record.departmentId)

  if (!employeeCode) {
    throw new AssetValidationError('Employee code is required.')
  }

  if (!fullName) {
    throw new AssetValidationError('Employee name is required.')
  }

  if (!Number.isInteger(departmentId) || departmentId < 1) {
    throw new AssetValidationError('A department must be selected.')
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AssetValidationError('Employee email must be valid.')
  }

  const department = await prisma.departments.findUnique({
    where: { Id: departmentId },
    select: { Id: true, IsActive: true },
  })

  if (!department || !department.IsActive) {
    throw new AssetValidationError('Selected department is invalid.')
  }

  return {
    EmployeeCode: employeeCode,
    FullName: fullName,
    Email: email,
    DepartmentId: departmentId,
  }
}

const insertHistoryEntry = async (runner: SqlRunner, entry: HistoryInsertInput) => {
  await runner.$executeRaw(Prisma.sql`
    INSERT INTO "AssetAssignmentHistory" (
      "AssetId",
      "TransactionDocumentId",
      "Type",
      "AssignedTo",
      "Department",
      "Location",
      "AssignedAt",
      "ReturnedAt",
      "Note",
      "AssignedById",
      "AssignedByName",
      "FromAssignedTo",
      "FromDepartment",
      "FromLocation"
    )
    VALUES (
      ${entry.assetId},
      ${entry.transactionDocumentId ?? null},
      ${entry.type},
      ${entry.assignedTo},
      ${entry.department},
      ${entry.location},
      ${entry.assignedAt},
      ${toSqlDateTimeValue(entry.returnedAt)},
      ${entry.note},
      ${entry.actorUserId},
      ${entry.actorName},
      ${entry.fromAssignedTo ?? null},
      ${entry.fromDepartment ?? null},
      ${entry.fromLocation ?? null}
    )
  `)
}

const closeLatestOpenAssignment = async (runner: SqlRunner, assetId: number, returnedAt: Date) => {
  const latestRows = await runner.$queryRaw<Array<{ Id: number }>>(Prisma.sql`
    SELECT "Id"
    FROM "AssetAssignmentHistory"
    WHERE "AssetId" = ${assetId}
      AND "ReturnedAt" IS NULL
      AND "Type" <> ${'Return'}
    ORDER BY "AssignedAt" DESC, "Id" DESC
    LIMIT 1
  `)

  const latestId = latestRows[0]?.Id
  if (!latestId) {
    return
  }

  await runner.$executeRaw(Prisma.sql`
    UPDATE "AssetAssignmentHistory"
    SET "ReturnedAt" = ${returnedAt}
    WHERE "Id" = ${latestId}
  `)
}

const getTransactionDocumentRows = async (
  runner: SqlRunner,
  type?: 'issue' | 'transfer'
) => {
  const typeClause = type
    ? Prisma.sql`WHERE document."TransactionType" = ${type}`
    : Prisma.empty

  return runner.$queryRaw<AssetTransactionDocumentRow[]>(Prisma.sql`
    SELECT
      document."Id",
      document."TransactionNumber",
      document."TransactionType",
      document."TransactionDate",
      document."IssuedTo",
      document."Department",
      document."Location",
      document."ResultingStatus",
      document."Note",
      document."AssetCount",
      document."CreatedById",
      document."CreatedByName",
      document."CreatedAt"
    FROM "AssetTransactionDocuments" AS document
    ${typeClause}
    ORDER BY document."TransactionDate" DESC, document."Id" DESC
  `)
}

const getTransactionDocumentByNumber = async (runner: SqlRunner, transactionNumber: string) => {
  const rows = await runner.$queryRaw<AssetTransactionDocumentRow[]>(Prisma.sql`
    SELECT
      document."Id",
      document."TransactionNumber",
      document."TransactionType",
      document."TransactionDate",
      document."IssuedTo",
      document."Department",
      document."Location",
      document."ResultingStatus",
      document."Note",
      document."AssetCount",
      document."CreatedById",
      document."CreatedByName",
      document."CreatedAt"
    FROM "AssetTransactionDocuments" AS document
    WHERE document."TransactionNumber" = ${transactionNumber}
  `)

  return rows[0] ?? null
}

const getTransactionDocumentLines = async (runner: SqlRunner, transactionDocumentId: number) =>
  runner.$queryRaw<AssetTransactionDocumentLineRow[]>(Prisma.sql`
    SELECT
      history."Id" AS "HistoryId",
      history."TransactionDocumentId",
      document."TransactionNumber",
      document."TransactionType",
      document."TransactionDate",
      asset."AssetCode",
      asset."Name" AS "AssetName",
      history."AssignedTo",
      history."Department",
      history."Location",
      history."AssignedAt",
      history."Note",
      history."AssignedByName",
      history."FromAssignedTo",
      history."FromDepartment",
      history."FromLocation"
    FROM "AssetAssignmentHistory" AS history
    INNER JOIN "Assets" AS asset ON asset."Id" = history."AssetId"
    INNER JOIN "AssetTransactionDocuments" AS document ON document."Id" = history."TransactionDocumentId"
    WHERE history."TransactionDocumentId" = ${transactionDocumentId}
    ORDER BY asset."AssetCode" ASC, history."AssignedAt" DESC
  `)

const formatTransactionDocumentSummary = (row: AssetTransactionDocumentRow) => ({
  id: row.Id,
  transactionNumber: row.TransactionNumber,
  transactionType: row.TransactionType,
  transactionDate: row.TransactionDate.toISOString(),
  assetCount: Number(row.AssetCount),
  issuedTo: row.IssuedTo,
  department: row.Department,
  location: row.Location,
  status: row.ResultingStatus,
  note: row.Note || '',
  createdBy: row.CreatedByName,
})

const formatTransactionDocumentLine = (row: AssetTransactionDocumentLineRow) => ({
  id: row.HistoryId,
  assetId: row.AssetCode,
  assetName: row.AssetName,
  assignedTo: row.AssignedTo,
  department: row.Department,
  location: row.Location,
  assignedAt: row.AssignedAt.toISOString(),
  note: row.Note || '',
  assignedBy: row.AssignedByName,
  fromAssignedTo: row.FromAssignedTo || '',
  fromDepartment: row.FromDepartment || '',
  fromLocation: row.FromLocation || '',
})

router.use(authenticate)
router.use(async (_req, _res, next) => {
  try {
    await ensureAssetTablesReady()
    next()
  } catch (error) {
    next(error)
  }
})

router.get('/meta', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetManagerAccess(req, res))) return

    const [categories, subcategories, vendors, departments, employees] = await Promise.all([
      getAssetCategoryRows(prisma),
      getAssetSubcategoryRows(prisma),
      getAssetVendorRows(prisma),
      getDepartmentRows(prisma),
      getAssetEmployeeRows(prisma),
    ])

    const locations = Array.from(
      new Set(
        departments
          .map((department) => department.Location?.trim() || '')
          .filter((location) => location.length > 0)
      )
    ).sort((left, right) => left.localeCompare(right))

    res.json({
      categories: categories.map((category) => category.Name),
      subcategories: subcategories.map(formatAssetSubcategory),
      vendors: vendors.map((vendor) => vendor.VendorName),
      statuses: [...assetStatuses],
      transactions: [...transactionTypes],
      departments: departments.map((department) => ({
        id: department.Id,
        name: department.Name,
        location: department.Location || '',
      })),
      locations,
      employees: employees.map(formatAssetEmployee),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load asset metadata' })
  }
})

router.get('/categories', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetAdminAccess(req, res))) return

    const categories = await getAssetCategoryRows(prisma, true)
    res.json(categories.map(formatAssetCategory))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load asset categories' })
  }
})

router.post('/categories', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetAdminAccess(req, res))) return

    const payload = validateAssetCategoryPayload(req.body)
    const duplicate = await prisma.$queryRaw<Array<{ Id: number }>>(Prisma.sql`
      SELECT "Id"
      FROM "AssetCategories"
      WHERE "Name" = ${payload.Name}
      LIMIT 1
    `)

    if (duplicate[0]?.Id) {
      throw new AssetValidationError('Asset category already exists.')
    }

    const now = new Date()
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "AssetCategories" ("Name", "Description", "IsActive", "CreatedAt", "UpdatedAt")
      VALUES (${payload.Name}, ${payload.Description}, ${payload.IsActive}, ${now}, ${now})
    `)

    const createdRows = await prisma.$queryRaw<Array<{ Id: number }>>(Prisma.sql`
      SELECT "Id"
      FROM "AssetCategories"
      WHERE "Name" = ${payload.Name}
      ORDER BY "Id" DESC
      LIMIT 1
    `)

    const created = createdRows[0]?.Id ? await getAssetCategoryById(prisma, createdRows[0].Id) : null
    if (!created) throw new Error('Failed to load created asset category.')

    res.status(201).json(formatAssetCategory(created))
  } catch (error) {
    console.error(error)
    const { statusCode, message } = getErrorResponse(error, 'Failed to create asset category')
    res.status(statusCode).json({ error: message })
  }
})

router.patch('/categories/:categoryId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetAdminAccess(req, res))) return

    const categoryId = Number(req.params.categoryId)
    if (!Number.isInteger(categoryId) || categoryId < 1) {
      throw new AssetValidationError('Asset category id is invalid.')
    }

    const payload = validateAssetCategoryPayload(req.body)
    const existing = await getAssetCategoryById(prisma, categoryId)
    if (!existing) {
      throw new AssetNotFoundError()
    }

    const duplicate = await prisma.$queryRaw<Array<{ Id: number }>>(Prisma.sql`
      SELECT "Id"
      FROM "AssetCategories"
      WHERE "Name" = ${payload.Name}
        AND "Id" <> ${categoryId}
      LIMIT 1
    `)

    if (duplicate[0]?.Id) {
      throw new AssetValidationError('Asset category already exists.')
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE "AssetCategories"
      SET
        "Name" = ${payload.Name},
        "Description" = ${payload.Description},
        "IsActive" = ${payload.IsActive},
        "UpdatedAt" = ${new Date()}
      WHERE "Id" = ${categoryId}
    `)

    const updated = await getAssetCategoryById(prisma, categoryId)
    if (!updated) throw new AssetNotFoundError()
    res.json(formatAssetCategory(updated))
  } catch (error) {
    console.error(error)
    const { statusCode, message } = getErrorResponse(error, 'Failed to update asset category')
    res.status(statusCode).json({ error: message })
  }
})

router.delete('/categories/:categoryId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetAdminAccess(req, res))) return

    const categoryId = Number(req.params.categoryId)
    if (!Number.isInteger(categoryId) || categoryId < 1) {
      throw new AssetValidationError('Asset category id is invalid.')
    }

    const existing = await getAssetCategoryById(prisma, categoryId)
    if (!existing) throw new AssetNotFoundError()

    await prisma.$executeRaw(Prisma.sql`
      UPDATE "AssetCategories"
      SET
        "IsActive" = ${false},
        "UpdatedAt" = ${new Date()}
      WHERE "Id" = ${categoryId}
    `)

    await prisma.$executeRaw(Prisma.sql`
      UPDATE "AssetSubcategories"
      SET
        "IsActive" = ${false},
        "UpdatedAt" = ${new Date()}
      WHERE "CategoryId" = ${categoryId}
    `)

    res.status(204).send()
  } catch (error) {
    console.error(error)
    const { statusCode, message } = getErrorResponse(error, 'Failed to delete asset category')
    res.status(statusCode).json({ error: message })
  }
})

router.get('/subcategories', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetAdminAccess(req, res))) return

    const subcategories = await getAssetSubcategoryRows(prisma, true)
    res.json(subcategories.map(formatAssetSubcategory))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load asset subcategories' })
  }
})

router.post('/subcategories', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetAdminAccess(req, res))) return

    const payload = await validateAssetSubcategoryPayload(req.body)
    const duplicate = await prisma.$queryRaw<Array<{ Id: number }>>(Prisma.sql`
      SELECT "Id"
      FROM "AssetSubcategories"
      WHERE "CategoryId" = ${payload.CategoryId}
        AND "Name" = ${payload.Name}
      LIMIT 1
    `)

    if (duplicate[0]?.Id) {
      throw new AssetValidationError('Asset subcategory already exists in this category.')
    }

    const now = new Date()
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "AssetSubcategories" ("CategoryId", "Name", "IsActive", "CreatedAt", "UpdatedAt")
      VALUES (${payload.CategoryId}, ${payload.Name}, ${payload.IsActive}, ${now}, ${now})
    `)

    const createdRows = await prisma.$queryRaw<Array<{ Id: number }>>(Prisma.sql`
      SELECT "Id"
      FROM "AssetSubcategories"
      WHERE "CategoryId" = ${payload.CategoryId}
        AND "Name" = ${payload.Name}
      ORDER BY "Id" DESC
      LIMIT 1
    `)

    const created = createdRows[0]?.Id ? await getAssetSubcategoryById(prisma, createdRows[0].Id) : null
    if (!created) throw new Error('Failed to load created asset subcategory.')

    res.status(201).json(formatAssetSubcategory(created))
  } catch (error) {
    console.error(error)
    const { statusCode, message } = getErrorResponse(error, 'Failed to create asset subcategory')
    res.status(statusCode).json({ error: message })
  }
})

router.patch('/subcategories/:subcategoryId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetAdminAccess(req, res))) return

    const subcategoryId = Number(req.params.subcategoryId)
    if (!Number.isInteger(subcategoryId) || subcategoryId < 1) {
      throw new AssetValidationError('Asset subcategory id is invalid.')
    }

    const payload = await validateAssetSubcategoryPayload(req.body)
    const existing = await getAssetSubcategoryById(prisma, subcategoryId)
    if (!existing) throw new AssetNotFoundError()

    const duplicate = await prisma.$queryRaw<Array<{ Id: number }>>(Prisma.sql`
      SELECT "Id"
      FROM "AssetSubcategories"
      WHERE "CategoryId" = ${payload.CategoryId}
        AND "Name" = ${payload.Name}
        AND "Id" <> ${subcategoryId}
      LIMIT 1
    `)

    if (duplicate[0]?.Id) {
      throw new AssetValidationError('Asset subcategory already exists in this category.')
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE "AssetSubcategories"
      SET
        "CategoryId" = ${payload.CategoryId},
        "Name" = ${payload.Name},
        "IsActive" = ${payload.IsActive},
        "UpdatedAt" = ${new Date()}
      WHERE "Id" = ${subcategoryId}
    `)

    const updated = await getAssetSubcategoryById(prisma, subcategoryId)
    if (!updated) throw new AssetNotFoundError()
    res.json(formatAssetSubcategory(updated))
  } catch (error) {
    console.error(error)
    const { statusCode, message } = getErrorResponse(error, 'Failed to update asset subcategory')
    res.status(statusCode).json({ error: message })
  }
})

router.delete('/subcategories/:subcategoryId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetAdminAccess(req, res))) return

    const subcategoryId = Number(req.params.subcategoryId)
    if (!Number.isInteger(subcategoryId) || subcategoryId < 1) {
      throw new AssetValidationError('Asset subcategory id is invalid.')
    }

    const existing = await getAssetSubcategoryById(prisma, subcategoryId)
    if (!existing) throw new AssetNotFoundError()

    await prisma.$executeRaw(Prisma.sql`
      UPDATE "AssetSubcategories"
      SET
        "IsActive" = ${false},
        "UpdatedAt" = ${new Date()}
      WHERE "Id" = ${subcategoryId}
    `)

    res.status(204).send()
  } catch (error) {
    console.error(error)
    const { statusCode, message } = getErrorResponse(error, 'Failed to delete asset subcategory')
    res.status(statusCode).json({ error: message })
  }
})

router.get('/vendors', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetAdminAccess(req, res))) return

    const vendors = await getAssetVendorRows(prisma)
    res.json(vendors.map(formatAssetVendor))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load asset vendors' })
  }
})

router.post('/vendors', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetAdminAccess(req, res))) return

    const payload = validateAssetVendorPayload(req.body)
    const duplicate = await prisma.$queryRaw<Array<{ Id: number }>>(Prisma.sql`
      SELECT "Id"
      FROM "AssetVendors"
      WHERE "VendorName" = ${payload.VendorName}
      LIMIT 1
    `)

    if (duplicate[0]?.Id) {
      throw new AssetValidationError('Vendor already exists.')
    }

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "AssetVendors" ("VendorName", "ErpVendorCode")
      VALUES (${payload.VendorName}, ${payload.ErpVendorCode})
    `)

    const createdRows = await prisma.$queryRaw<Array<{ Id: number }>>(Prisma.sql`
      SELECT "Id"
      FROM "AssetVendors"
      WHERE "VendorName" = ${payload.VendorName}
      ORDER BY "Id" DESC
      LIMIT 1
    `)

    const created = createdRows[0]?.Id ? await getAssetVendorById(prisma, createdRows[0].Id) : null
    if (!created) throw new Error('Failed to load created vendor.')

    res.status(201).json(formatAssetVendor(created))
  } catch (error) {
    console.error(error)
    const { statusCode, message } = getErrorResponse(error, 'Failed to create asset vendor')
    res.status(statusCode).json({ error: message })
  }
})

router.patch('/vendors/:vendorId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetAdminAccess(req, res))) return

    const vendorId = Number(req.params.vendorId)
    if (!Number.isInteger(vendorId) || vendorId < 1) {
      throw new AssetValidationError('Vendor id is invalid.')
    }

    const payload = validateAssetVendorPayload(req.body)
    const existing = await getAssetVendorById(prisma, vendorId)
    if (!existing) throw new AssetNotFoundError()

    const duplicate = await prisma.$queryRaw<Array<{ Id: number }>>(Prisma.sql`
      SELECT "Id"
      FROM "AssetVendors"
      WHERE "VendorName" = ${payload.VendorName}
        AND "Id" <> ${vendorId}
      LIMIT 1
    `)

    if (duplicate[0]?.Id) {
      throw new AssetValidationError('Vendor already exists.')
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE "AssetVendors"
      SET
        "VendorName" = ${payload.VendorName},
        "ErpVendorCode" = ${payload.ErpVendorCode}
      WHERE "Id" = ${vendorId}
    `)

    const updated = await getAssetVendorById(prisma, vendorId)
    if (!updated) throw new AssetNotFoundError()
    res.json(formatAssetVendor(updated))
  } catch (error) {
    console.error(error)
    const { statusCode, message } = getErrorResponse(error, 'Failed to update asset vendor')
    res.status(statusCode).json({ error: message })
  }
})

router.delete('/vendors/:vendorId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetAdminAccess(req, res))) return

    const vendorId = Number(req.params.vendorId)
    if (!Number.isInteger(vendorId) || vendorId < 1) {
      throw new AssetValidationError('Vendor id is invalid.')
    }

    const existing = await getAssetVendorById(prisma, vendorId)
    if (!existing) throw new AssetNotFoundError()

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "AssetVendors"
      WHERE "Id" = ${vendorId}
    `)

    res.status(204).send()
  } catch (error) {
    console.error(error)
    const { statusCode, message } = getErrorResponse(error, 'Failed to delete asset vendor')
    res.status(statusCode).json({ error: message })
  }
})

router.get('/employees', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetAdminAccess(req, res))) return

    const employees = await getAssetEmployeeRows(prisma, true)
    res.json(employees.map(formatAssetEmployee))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load asset employees' })
  }
})

router.post('/employees', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetAdminAccess(req, res))) return

    const payload = await validateAssetEmployeePayload(req.body)
    const existingCode = await prisma.$queryRaw<Array<{ Id: number }>>(Prisma.sql`
      SELECT "Id"
      FROM "AssetEmployees"
      WHERE "EmployeeCode" = ${payload.EmployeeCode}
      LIMIT 1
    `)

    if (existingCode[0]?.Id) {
      throw new AssetValidationError('Employee code already exists.')
    }

    const now = new Date()
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "AssetEmployees" (
        "EmployeeCode",
        "FullName",
        "Email",
        "DepartmentId",
        "IsActive",
        "CreatedAt",
        "UpdatedAt"
      )
      VALUES (
        ${payload.EmployeeCode},
        ${payload.FullName},
        ${payload.Email},
        ${payload.DepartmentId},
        ${true},
        ${now},
        ${now}
      )
    `)

    const createdRows = await prisma.$queryRaw<Array<{ Id: number }>>(Prisma.sql`
      SELECT "Id"
      FROM "AssetEmployees"
      WHERE "EmployeeCode" = ${payload.EmployeeCode}
      ORDER BY "Id" DESC
      LIMIT 1
    `)

    const createdId = createdRows[0]?.Id
    if (!createdId) {
      throw new Error('Failed to load created employee.')
    }

    const created = await getAssetEmployeeById(prisma, createdId)
    if (!created) {
      throw new Error('Failed to load created employee.')
    }

    res.status(201).json(formatAssetEmployee(created))
  } catch (error) {
    console.error(error)
    const { statusCode, message } = getErrorResponse(error, 'Failed to create asset employee')
    res.status(statusCode).json({ error: message })
  }
})

router.patch('/employees/:employeeId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetAdminAccess(req, res))) return

    const employeeId = Number(req.params.employeeId)
    if (!Number.isInteger(employeeId) || employeeId < 1) {
      throw new AssetValidationError('Employee id is invalid.')
    }

    const payload = await validateAssetEmployeePayload(req.body)
    const existing = await getAssetEmployeeById(prisma, employeeId)
    if (!existing) {
      throw new AssetNotFoundError()
    }

    const duplicate = await prisma.$queryRaw<Array<{ Id: number }>>(Prisma.sql`
      SELECT "Id"
      FROM "AssetEmployees"
      WHERE "EmployeeCode" = ${payload.EmployeeCode}
        AND "Id" <> ${employeeId}
      LIMIT 1
    `)

    if (duplicate[0]?.Id) {
      throw new AssetValidationError('Employee code already exists.')
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE "AssetEmployees"
      SET
        "EmployeeCode" = ${payload.EmployeeCode},
        "FullName" = ${payload.FullName},
        "Email" = ${payload.Email},
        "DepartmentId" = ${payload.DepartmentId},
        "UpdatedAt" = ${new Date()}
      WHERE "Id" = ${employeeId}
    `)

    const updated = await getAssetEmployeeById(prisma, employeeId)
    if (!updated) {
      throw new AssetNotFoundError()
    }

    res.json(formatAssetEmployee(updated))
  } catch (error) {
    console.error(error)
    const { statusCode, message } = getErrorResponse(error, 'Failed to update asset employee')
    res.status(statusCode).json({ error: message })
  }
})

router.delete('/employees/:employeeId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetAdminAccess(req, res))) return

    const employeeId = Number(req.params.employeeId)
    if (!Number.isInteger(employeeId) || employeeId < 1) {
      throw new AssetValidationError('Employee id is invalid.')
    }

    const existing = await getAssetEmployeeById(prisma, employeeId)
    if (!existing) {
      throw new AssetNotFoundError()
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE "AssetEmployees"
      SET
        "IsActive" = ${false},
        "UpdatedAt" = ${new Date()}
      WHERE "Id" = ${employeeId}
    `)

    res.status(204).send()
  } catch (error) {
    console.error(error)
    const { statusCode, message } = getErrorResponse(error, 'Failed to delete asset employee')
    res.status(statusCode).json({ error: message })
  }
})

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetManagerAccess(req, res))) return

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : ''
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : ''

    const assets = await getAssetRows(prisma, { search, category, status })
    res.json(await hydrateAssets(prisma, assets))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch assets' })
  }
})

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetManagerAccess(req, res))) return

    const normalized = await validateAssetPayload(req.body)
    const actorUserId = getActorUserId(req)
    const actorName = getActorName(req)
    const now = new Date()

    const created = await prisma.$transaction(async (tx) => {
      const assetCode = await toNextAssetCode(tx)

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "Assets" (
          "AssetCode",
          "Name",
          "Category",
          "Subcategory",
          "SerialNumber",
          "ImeiNumber",
          "BrandModel",
          "Vendor",
          "PurchaseDate",
          "PurchaseCost",
          "ExpiryDate",
          "WarrantyExpiry",
          "AssignedTo",
          "Department",
          "Location",
          "Status",
          "Notes",
          "CreatedById",
          "UpdatedById",
          "CreatedAt",
          "UpdatedAt"
        )
        VALUES (
          ${assetCode},
          ${normalized.Name},
          ${normalized.Category},
          ${normalized.Subcategory},
          ${normalized.SerialNumber},
          ${normalized.ImeiNumber},
          ${normalized.BrandModel},
          ${normalized.Vendor},
          ${normalized.PurchaseDate},
          ${normalized.PurchaseCost},
          ${toSqlDateValue(normalized.ExpiryDate)},
          ${toSqlDateValue(normalized.WarrantyExpiry)},
          ${normalized.AssignedTo},
          ${normalized.Department},
          ${normalized.Location},
          ${normalized.Status},
          ${normalized.Notes},
          ${actorUserId},
          ${actorUserId},
          ${now},
          ${now}
        )
      `)

      const inserted = await getAssetRowByCode(tx, assetCode)
      if (!inserted) {
        throw new Error('Failed to load created asset.')
      }

      if (normalized.AssignedTo) {
        await insertHistoryEntry(tx, {
          assetId: inserted.Id,
          type: 'Issue',
          assignedTo: normalized.AssignedTo,
          department: normalized.Department,
          location: normalized.Location,
          assignedAt: now,
          note: 'Asset created with an active assignment.',
          actorUserId,
          actorName,
        })
      }

      const hydrated = await getHydratedAssetByCode(tx, assetCode)
      if (!hydrated) {
        throw new Error('Failed to load created asset.')
      }

      return hydrated
    })

    res.status(201).json(created)
  } catch (error) {
    console.error(error)
    const { statusCode, message } = getErrorResponse(error, 'Failed to create asset')
    res.status(statusCode).json({ error: message })
  }
})

router.get('/transactions/documents', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetManagerAccess(req, res))) return

    const typeParam = String(req.query.type ?? '').trim().toLowerCase()
    const documentType =
      typeParam === 'issue' || typeParam === 'transfer'
        ? (typeParam as 'issue' | 'transfer')
        : undefined

    const documents = await getTransactionDocumentRows(prisma, documentType)
    res.json(documents.map(formatTransactionDocumentSummary))
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load asset transaction documents' })
  }
})

router.get('/transactions/documents/:transactionNumber', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetManagerAccess(req, res))) return

    const transactionNumber = String(req.params.transactionNumber)
    const document = await getTransactionDocumentByNumber(prisma, transactionNumber)

    if (!document) {
      res.status(404).json({ error: 'Transaction document not found' })
      return
    }

    const lines = await getTransactionDocumentLines(prisma, document.Id)

    res.json({
      ...formatTransactionDocumentSummary(document),
      items: lines.map(formatTransactionDocumentLine),
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to load transaction document' })
  }
})

router.post('/transactions/batch', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetManagerAccess(req, res))) return

    const actorUserId = getActorUserId(req)
    const actorName = getActorName(req)
    const now = new Date()
    const batchTransaction = validateBatchTransactionPayload(req.body)

    const result = await prisma.$transaction(async (tx) => {
      const assets = await getAssetRowsByCodes(tx, batchTransaction.assetCodes)

      if (assets.length !== batchTransaction.assetCodes.length) {
        throw new AssetValidationError('One or more selected assets could not be found.')
      }

      if (batchTransaction.type === 'issue') {
        const invalidAsset = assets.find((asset) => !!asset.AssignedTo)
        if (invalidAsset) {
          throw new AssetValidationError(`${invalidAsset.AssetCode} is already assigned and cannot be issued from stock.`)
        }
      }

      if (batchTransaction.type === 'transfer') {
        const invalidAsset = assets.find((asset) => !asset.AssignedTo)
        if (invalidAsset) {
          throw new AssetValidationError(`${invalidAsset.AssetCode} must be assigned before it can be transferred.`)
        }
      }

      const transactionNumber = await toNextTransactionNumber(tx)

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO "AssetTransactionDocuments" (
          "TransactionNumber",
          "TransactionType",
          "TransactionDate",
          "IssuedTo",
          "Department",
          "Location",
          "ResultingStatus",
          "Note",
          "AssetCount",
          "CreatedById",
          "CreatedByName"
        )
        VALUES (
          ${transactionNumber},
          ${batchTransaction.type},
          ${now},
          ${batchTransaction.assignedTo || 'Pending assignee'},
          ${batchTransaction.department},
          ${batchTransaction.location},
          ${batchTransaction.status},
          ${batchTransaction.note},
          ${assets.length},
          ${actorUserId},
          ${actorName}
        )
      `)

      const document = await getTransactionDocumentByNumber(tx, transactionNumber)
      if (!document) {
        throw new AssetValidationError('Transaction document could not be created.')
      }

      for (const asset of assets) {
        if (batchTransaction.type === 'issue') {
          if (asset.AssignedTo) {
            await closeLatestOpenAssignment(tx, asset.Id, now)
          }

          await insertHistoryEntry(tx, {
            assetId: asset.Id,
            transactionDocumentId: document.Id,
            type: 'Issue',
            assignedTo: batchTransaction.assignedTo || 'Pending assignee',
            department: batchTransaction.department,
            location: batchTransaction.location,
            assignedAt: now,
            note: batchTransaction.note || 'Asset issued to the selected assignee.',
            actorUserId,
            actorName,
            fromAssignedTo: asset.AssignedTo,
            fromDepartment: asset.Department,
            fromLocation: asset.Location,
          })
        } else {
          await closeLatestOpenAssignment(tx, asset.Id, now)

          await insertHistoryEntry(tx, {
            assetId: asset.Id,
            transactionDocumentId: document.Id,
            type: 'Transfer',
            assignedTo: batchTransaction.assignedTo || 'Pending assignee',
            department: batchTransaction.department,
            location: batchTransaction.location,
            assignedAt: now,
            note: batchTransaction.note || 'Asset transferred to a new owner.',
            actorUserId,
            actorName,
            fromAssignedTo: asset.AssignedTo,
            fromDepartment: asset.Department,
            fromLocation: asset.Location,
          })
        }

        await tx.$executeRaw(Prisma.sql`
          UPDATE "Assets"
          SET
            "AssignedTo" = ${batchTransaction.assignedTo},
            "Department" = ${batchTransaction.department},
            "Location" = ${batchTransaction.location},
            "Status" = ${batchTransaction.status},
            "UpdatedById" = ${actorUserId},
            "UpdatedAt" = ${now}
          WHERE "AssetCode" = ${asset.AssetCode}
        `)
      }

      const lines = await getTransactionDocumentLines(tx, document.Id)

      return {
        ...formatTransactionDocumentSummary(document),
        items: lines.map(formatTransactionDocumentLine),
      }
    })

    res.status(201).json(result)
  } catch (error) {
    console.error(error)
    const { statusCode, message } = getErrorResponse(error, 'Failed to save asset transaction document')
    res.status(statusCode).json({ error: message })
  }
})

router.get('/:assetCode', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetManagerAccess(req, res))) return

    const asset = await getHydratedAssetByCode(prisma, String(req.params.assetCode))
    if (!asset) {
      res.status(404).json({ error: 'Asset not found' })
      return
    }

    res.json(asset)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to retrieve asset' })
  }
})

router.patch('/:assetCode', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetManagerAccess(req, res))) return

    const assetCode = String(req.params.assetCode)
    const normalized = await validateAssetPayload(req.body)
    const actorUserId = getActorUserId(req)
    const actorName = getActorName(req)
    const now = new Date()

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await getAssetRowByCode(tx, assetCode)
      if (!existing) {
        throw new AssetNotFoundError()
      }

      const existingAssignedTo = existing.AssignedTo || null
      const nextAssignedTo = normalized.AssignedTo || null
      const assignmentChanged =
        existingAssignedTo !== nextAssignedTo ||
        existing.Department !== normalized.Department ||
        existing.Location !== normalized.Location

      if (assignmentChanged && nextAssignedTo) {
        if (existingAssignedTo) {
          await closeLatestOpenAssignment(tx, existing.Id, now)
        }

        await insertHistoryEntry(tx, {
          assetId: existing.Id,
          type: existingAssignedTo ? 'Transfer' : 'Issue',
          assignedTo: nextAssignedTo,
          department: normalized.Department,
          location: normalized.Location,
          assignedAt: now,
          note: existingAssignedTo
            ? 'Assignment details updated through the asset form.'
            : 'Assignment added through the asset form.',
          actorUserId,
          actorName,
          fromAssignedTo: existingAssignedTo,
          fromDepartment: existing.Department,
          fromLocation: existing.Location,
        })
      }

      if (assignmentChanged && !nextAssignedTo && existingAssignedTo) {
        await closeLatestOpenAssignment(tx, existing.Id, now)
        await insertHistoryEntry(tx, {
          assetId: existing.Id,
          type: 'Return',
          assignedTo: existingAssignedTo,
          department: normalized.Department,
          location: normalized.Location,
          assignedAt: now,
          returnedAt: now,
          note: 'Asset returned through the asset form.',
          actorUserId,
          actorName,
          fromAssignedTo: existingAssignedTo,
          fromDepartment: existing.Department,
          fromLocation: existing.Location,
        })
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE "Assets"
        SET
          "Name" = ${normalized.Name},
          "Category" = ${normalized.Category},
          "Subcategory" = ${normalized.Subcategory},
          "SerialNumber" = ${normalized.SerialNumber},
          "ImeiNumber" = ${normalized.ImeiNumber},
          "BrandModel" = ${normalized.BrandModel},
          "Vendor" = ${normalized.Vendor},
          "PurchaseDate" = ${normalized.PurchaseDate},
          "PurchaseCost" = ${normalized.PurchaseCost},
          "ExpiryDate" = ${toSqlDateValue(normalized.ExpiryDate)},
          "WarrantyExpiry" = ${toSqlDateValue(normalized.WarrantyExpiry)},
          "AssignedTo" = ${normalized.AssignedTo},
          "Department" = ${normalized.Department},
          "Location" = ${normalized.Location},
          "Status" = ${normalized.Status},
          "Notes" = ${normalized.Notes},
          "UpdatedById" = ${actorUserId},
          "UpdatedAt" = ${now}
        WHERE "AssetCode" = ${assetCode}
      `)

      const hydrated = await getHydratedAssetByCode(tx, assetCode)
      if (!hydrated) {
        throw new AssetNotFoundError()
      }

      return hydrated
    })

    res.json(updated)
  } catch (error) {
    console.error(error)
    const { statusCode, message } = getErrorResponse(error, 'Failed to update asset')
    res.status(statusCode).json({ error: message })
  }
})

router.delete('/:assetCode', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetManagerAccess(req, res))) return

    const assetCode = String(req.params.assetCode)
    const existing = await getAssetRowByCode(prisma, assetCode)
    if (!existing) {
      res.status(404).json({ error: 'Asset not found' })
      return
    }

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "Assets"
      WHERE "AssetCode" = ${assetCode}
    `)

    res.status(204).send()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete asset' })
  }
})

router.post('/:assetCode/transactions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!(await ensureAssetManagerAccess(req, res))) return

    const assetCode = String(req.params.assetCode)
    const actorUserId = getActorUserId(req)
    const actorName = getActorName(req)
    const now = new Date()

    const result = await prisma.$transaction(async (tx) => {
      const existing = await getAssetRowByCode(tx, assetCode)
      if (!existing) {
        throw new AssetNotFoundError()
      }

      const transaction = validateTransactionPayload(req.body, existing.AssignedTo)

      if (transaction.type === 'issue') {
        if (existing.AssignedTo) {
          await closeLatestOpenAssignment(tx, existing.Id, now)
        }

        await insertHistoryEntry(tx, {
          assetId: existing.Id,
          type: 'Issue',
          assignedTo: transaction.assignedTo || 'Pending assignee',
          department: transaction.department,
          location: transaction.location,
          assignedAt: now,
          note: transaction.note || 'Asset issued to the selected assignee.',
          actorUserId,
          actorName,
          fromAssignedTo: existing.AssignedTo,
          fromDepartment: existing.Department,
          fromLocation: existing.Location,
        })

        await tx.$executeRaw(Prisma.sql`
          UPDATE "Assets"
          SET
            "AssignedTo" = ${transaction.assignedTo},
            "Department" = ${transaction.department},
            "Location" = ${transaction.location},
            "Status" = ${transaction.status},
            "UpdatedById" = ${actorUserId},
            "UpdatedAt" = ${now}
          WHERE "AssetCode" = ${assetCode}
        `)
      } else if (transaction.type === 'transfer') {
        await closeLatestOpenAssignment(tx, existing.Id, now)

        await insertHistoryEntry(tx, {
          assetId: existing.Id,
          type: 'Transfer',
          assignedTo: transaction.assignedTo || 'Pending assignee',
          department: transaction.department,
          location: transaction.location,
          assignedAt: now,
          note: transaction.note || 'Asset transferred to a new owner.',
          actorUserId,
          actorName,
          fromAssignedTo: existing.AssignedTo,
          fromDepartment: existing.Department,
          fromLocation: existing.Location,
        })

        await tx.$executeRaw(Prisma.sql`
          UPDATE "Assets"
          SET
            "AssignedTo" = ${transaction.assignedTo},
            "Department" = ${transaction.department},
            "Location" = ${transaction.location},
            "Status" = ${transaction.status},
            "UpdatedById" = ${actorUserId},
            "UpdatedAt" = ${now}
          WHERE "AssetCode" = ${assetCode}
        `)
      } else {
        await closeLatestOpenAssignment(tx, existing.Id, now)

        await insertHistoryEntry(tx, {
          assetId: existing.Id,
          type: 'Return',
          assignedTo: existing.AssignedTo || 'Unassigned asset',
          department: transaction.department,
          location: transaction.location,
          assignedAt: now,
          returnedAt: now,
          note: transaction.note || 'Asset returned to stock or a holding location.',
          actorUserId,
          actorName,
          fromAssignedTo: existing.AssignedTo,
          fromDepartment: existing.Department,
          fromLocation: existing.Location,
        })

        await tx.$executeRaw(Prisma.sql`
          UPDATE "Assets"
          SET
            "AssignedTo" = ${null},
            "Department" = ${transaction.department},
            "Location" = ${transaction.location},
            "Status" = ${transaction.status},
            "UpdatedById" = ${actorUserId},
            "UpdatedAt" = ${now}
          WHERE "AssetCode" = ${assetCode}
        `)
      }

      const hydrated = await getHydratedAssetByCode(tx, assetCode)
      if (!hydrated) {
        throw new AssetNotFoundError()
      }

      return hydrated
    })

    res.json(result)
  } catch (error) {
    console.error(error)
    const { statusCode, message } = getErrorResponse(error, 'Failed to save asset transaction')
    res.status(statusCode).json({ error: message })
  }
})

export default router
