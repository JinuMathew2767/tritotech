import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { ensureAssetTables } from './src/services/assetService'
import { ensureRoutingRulesTable } from './src/services/routingRulesService'

const sql: any = require('mssql')

type TableConfig = {
  sourceTable: string
  targetTable: string
  columns: string[]
  orderBy?: string[]
  defaults?: Record<string, unknown>
}

const prisma = new PrismaClient()

const tableConfigs: TableConfig[] = [
  {
    sourceTable: 'Roles',
    targetTable: 'Roles',
    columns: ['Id', 'Name', 'Description'],
  },
  {
    sourceTable: 'Companies',
    targetTable: 'Companies',
    columns: ['Id', 'Name', 'IsActive', 'CreatedAt'],
  },
  {
    sourceTable: 'Departments',
    targetTable: 'Departments',
    columns: ['Id', 'Name', 'IsActive', 'CreatedAt', 'Location'],
    defaults: { Location: null },
  },
  {
    sourceTable: 'Users',
    targetTable: 'Users',
    columns: [
      'Id',
      'FullName',
      'Email',
      'PasswordHash',
      'MobileNumber',
      'CompanyId',
      'DepartmentId',
      'RoleId',
      'Status',
      'AuthProvider',
      'ProviderId',
      'CreatedAt',
      'UpdatedAt',
    ],
  },
  {
    sourceTable: 'Categories',
    targetTable: 'Categories',
    columns: ['Id', 'Name', 'Description', 'DefaultAssigneeId', 'IsActive'],
  },
  {
    sourceTable: 'Subcategories',
    targetTable: 'Subcategories',
    columns: ['Id', 'CategoryId', 'Name', 'IsActive'],
  },
  {
    sourceTable: 'Tickets',
    targetTable: 'Tickets',
    columns: [
      'Id',
      'TicketNumber',
      'Title',
      'Description',
      'CompanyId',
      'DepartmentId',
      'CategoryId',
      'SubcategoryId',
      'Priority',
      'Status',
      'CreatedById',
      'AssignedToId',
      'CreatedAt',
      'UpdatedAt',
      'CustomerExpectedResolutionAt',
      'SupportExpectedResolutionAt',
      'ResolvedAt',
      'ClosedAt',
    ],
    defaults: {
      CustomerExpectedResolutionAt: null,
      SupportExpectedResolutionAt: null,
      ResolvedAt: null,
      ClosedAt: null,
    },
  },
  {
    sourceTable: 'TicketComments',
    targetTable: 'TicketComments',
    columns: ['Id', 'TicketId', 'UserId', 'CommentText', 'IsInternal', 'CreatedAt'],
  },
  {
    sourceTable: 'TicketAttachments',
    targetTable: 'TicketAttachments',
    columns: ['Id', 'TicketId', 'CommentId', 'UploaderId', 'FileName', 'FilePath', 'FileSize', 'ContentType', 'CreatedAt'],
  },
  {
    sourceTable: 'TicketActivityLogs',
    targetTable: 'TicketActivityLogs',
    columns: ['Id', 'TicketId', 'UserId', 'Action', 'OldValue', 'NewValue', 'CreatedAt'],
  },
  {
    sourceTable: 'Notifications',
    targetTable: 'Notifications',
    columns: ['Id', 'UserId', 'TicketId', 'Title', 'Message', 'IsRead', 'CreatedAt'],
  },
  {
    sourceTable: 'Assets',
    targetTable: 'Assets',
    columns: [
      'Id',
      'AssetCode',
      'Name',
      'Category',
      'Subcategory',
      'SerialNumber',
      'ImeiNumber',
      'BrandModel',
      'Vendor',
      'PurchaseDate',
      'PurchaseCost',
      'ExpiryDate',
      'WarrantyExpiry',
      'AssignedTo',
      'Department',
      'Location',
      'Status',
      'Notes',
      'CreatedById',
      'UpdatedById',
      'CreatedAt',
      'UpdatedAt',
    ],
    defaults: {
      SerialNumber: null,
      ImeiNumber: null,
      ExpiryDate: null,
      WarrantyExpiry: null,
    },
  },
  {
    sourceTable: 'AssetCategories',
    targetTable: 'AssetCategories',
    columns: ['Id', 'Name', 'Description', 'IsActive', 'CreatedAt', 'UpdatedAt'],
  },
  {
    sourceTable: 'AssetSubcategories',
    targetTable: 'AssetSubcategories',
    columns: ['Id', 'CategoryId', 'Name', 'IsActive', 'CreatedAt', 'UpdatedAt'],
  },
  {
    sourceTable: 'AssetVendors',
    targetTable: 'AssetVendors',
    columns: ['Id', 'VendorName', 'ErpVendorCode'],
    defaults: { ErpVendorCode: null },
  },
  {
    sourceTable: 'AssetEmployees',
    targetTable: 'AssetEmployees',
    columns: ['Id', 'EmployeeCode', 'FullName', 'Email', 'DepartmentId', 'IsActive', 'CreatedAt', 'UpdatedAt'],
  },
  {
    sourceTable: 'AssetTransactionDocuments',
    targetTable: 'AssetTransactionDocuments',
    columns: [
      'Id',
      'TransactionNumber',
      'TransactionType',
      'TransactionDate',
      'IssuedTo',
      'Department',
      'Location',
      'ResultingStatus',
      'Note',
      'AssetCount',
      'CreatedById',
      'CreatedByName',
      'CreatedAt',
    ],
  },
  {
    sourceTable: 'AssetAssignmentHistory',
    targetTable: 'AssetAssignmentHistory',
    columns: [
      'Id',
      'AssetId',
      'TransactionDocumentId',
      'Type',
      'AssignedTo',
      'Department',
      'Location',
      'AssignedAt',
      'ReturnedAt',
      'Note',
      'AssignedById',
      'AssignedByName',
      'FromAssignedTo',
      'FromDepartment',
      'FromLocation',
    ],
    defaults: { TransactionDocumentId: null },
  },
  {
    sourceTable: 'RoutingRules',
    targetTable: 'RoutingRules',
    columns: [
      'Id',
      'Name',
      'CompanyId',
      'DepartmentId',
      'CategoryId',
      'AssigneeUserId',
      'Priority',
      'IsActive',
      'CreatedAt',
      'UpdatedAt',
      'CreatedById',
      'UpdatedById',
    ],
  },
]

const targetTableList = tableConfigs.map((config) => `"${config.targetTable}"`).join(', ')

const chunk = <T>(items: T[], size: number) => {
  const batches: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size))
  }
  return batches
}

const normalizeValue = (value: unknown) => {
  if (value === undefined) return null
  if (typeof value === 'bigint') return Number(value)
  if (Buffer.isBuffer(value)) return value.toString('utf8')
  return value
}

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (!value) return fallback
  return value.trim().toLowerCase() === 'true'
}

const parseLegacySqlServerUrl = (connectionString: string) => {
  const normalized = connectionString.trim()
  const prefix = 'sqlserver://'

  if (!normalized.toLowerCase().startsWith(prefix)) {
    throw new Error('LEGACY_DATABASE_URL must start with sqlserver://')
  }

  const withoutProtocol = normalized.slice(prefix.length)
  const [serverPart, ...rawParams] = withoutProtocol.split(';').filter(Boolean)
  const [serverName, portText] = serverPart.split(':')

  if (!serverName) {
    throw new Error('LEGACY_DATABASE_URL must include a SQL Server host.')
  }

  const params = new Map<string, string>()
  for (const rawParam of rawParams) {
    const [rawKey, ...rawValueParts] = rawParam.split('=')
    const key = rawKey?.trim().toLowerCase()
    const value = rawValueParts.join('=').trim()
    if (key) {
      params.set(key, value)
    }
  }

  const database = params.get('database')
  const user = params.get('user')
  const password = params.get('password')

  if (!database) {
    throw new Error('LEGACY_DATABASE_URL must include database=...')
  }

  if (!user || !password) {
    throw new Error('LEGACY_DATABASE_URL must include user=... and password=...')
  }

  return {
    server: serverName,
    port: portText ? Number(portText) : 1433,
    user,
    password,
    database,
    options: {
      encrypt: parseBoolean(params.get('encrypt'), true),
      trustServerCertificate: parseBoolean(params.get('trustservercertificate'), false),
      enableArithAbort: true,
    },
  }
}

const sourceTableExists = async (pool: any, tableName: string) => {
  const result = await pool
    .request()
    .input('tableName', sql.NVarChar, tableName)
    .query(`
      SELECT 1 AS found
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @tableName
    `)

  return result.recordset.length > 0
}

const fetchSourceRows = async (pool: any, config: TableConfig) => {
  if (!(await sourceTableExists(pool, config.sourceTable))) {
    console.log(`Skipping ${config.sourceTable}: source table not found`)
    return [] as Record<string, unknown>[]
  }

  const orderBy = (config.orderBy ?? ['Id']).map((column) => `[${column}] ASC`).join(', ')
  const query = `SELECT * FROM [dbo].[${config.sourceTable}]${orderBy ? ` ORDER BY ${orderBy}` : ''}`
  const result = await pool.request().query(query)
  return result.recordset as Record<string, unknown>[]
}

const insertRows = async (config: TableConfig, rows: Record<string, unknown>[]) => {
  if (rows.length === 0) {
    return
  }

  const quotedColumns = config.columns.map((column) => `"${column}"`).join(', ')

  for (const batchRows of chunk(rows, 100)) {
    const values: unknown[] = []
    let placeholderIndex = 1

    const tuples = batchRows.map((row) => {
      const placeholders = config.columns.map((column) => {
        const value =
          row[column] !== undefined
            ? row[column]
            : config.defaults && Object.prototype.hasOwnProperty.call(config.defaults, column)
              ? config.defaults[column]
              : null

        values.push(normalizeValue(value))
        return `$${placeholderIndex++}`
      })

      return `(${placeholders.join(', ')})`
    })

    const query = `INSERT INTO "${config.targetTable}" (${quotedColumns}) VALUES ${tuples.join(', ')}`
    await prisma.$executeRawUnsafe(query, ...values)
  }
}

const resetSequence = async (tableName: string) => {
  await prisma.$executeRawUnsafe(`
    SELECT setval(
      pg_get_serial_sequence('"${tableName}"', 'Id'),
      COALESCE((SELECT MAX("Id") FROM "${tableName}"), 1),
      COALESCE((SELECT MAX("Id") IS NOT NULL FROM "${tableName}"), false)
    )
  `)
}

async function main() {
  const legacyUrl = process.env.LEGACY_DATABASE_URL?.trim()
  const confirmation = process.env.MIGRATE_LEGACY_CONFIRM?.trim().toUpperCase()

  if (!legacyUrl) {
    throw new Error('LEGACY_DATABASE_URL is required to migrate old SQL Server data.')
  }

  if (confirmation !== 'YES') {
    throw new Error('Set MIGRATE_LEGACY_CONFIRM=YES before running this import because it clears the current Neon data first.')
  }

  console.log('Preparing Postgres target tables...')
  await ensureAssetTables()
  await ensureRoutingRulesTable()

  console.log('Connecting to legacy SQL Server...')
  const legacyPool = await sql.connect(parseLegacySqlServerUrl(legacyUrl))

  try {
    console.log('Clearing current Neon data...')
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${targetTableList} RESTART IDENTITY CASCADE`)

    for (const config of tableConfigs) {
      const rows = await fetchSourceRows(legacyPool, config)
      console.log(`Importing ${config.sourceTable}: ${rows.length} row(s)`)
      await insertRows(config, rows)
      await resetSequence(config.targetTable)
    }

    console.log('Legacy data migration completed successfully.')
  } finally {
    await legacyPool.close()
  }
}

main()
  .catch((error) => {
    console.error('Legacy migration failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
