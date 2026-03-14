import { Prisma } from '@prisma/client'
import { prisma } from '../db'

export interface RoutingRuleRecord {
  id: number
  name: string
  priority: number
  is_active: boolean
  company_id: number | null
  company: string | null
  department_id: number | null
  department: string | null
  category_id: number | null
  category: string | null
  assignee_user_id: number
  assignee_name: string
  created_at: string
  updated_at: string
  created_by_name: string | null
  updated_by_name: string | null
}

export interface RoutingRuleMeta {
  companies: Array<{ id: number; label: string }>
  departments: Array<{ id: number; label: string }>
  categories: Array<{ id: number; label: string }>
  assignees: Array<{ id: number; label: string; role: string }>
}

export interface RoutingRulePayload {
  name: string
  priority: number
  is_active: boolean
  company_id: number | null
  department_id: number | null
  category_id: number | null
  assignee_user_id: number
}

interface DbRoutingRuleRow {
  id: number
  name: string
  priority: number
  is_active: boolean
  company_id: number | null
  company: string | null
  department_id: number | null
  department: string | null
  category_id: number | null
  category: string | null
  assignee_user_id: number
  assignee_name: string
  created_at: Date
  updated_at: Date
  created_by_name: string | null
  updated_by_name: string | null
}

const ensureRoutingRulesStatements = [
  `
  CREATE TABLE IF NOT EXISTS "RoutingRules" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(150) NOT NULL,
    "CompanyId" INTEGER NULL,
    "DepartmentId" INTEGER NULL,
    "CategoryId" INTEGER NULL,
    "AssigneeUserId" INTEGER NOT NULL,
    "Priority" INTEGER NOT NULL DEFAULT 100,
    "IsActive" BOOLEAN NOT NULL DEFAULT TRUE,
    "CreatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "CreatedById" INTEGER NOT NULL,
    "UpdatedById" INTEGER NULL,
    CONSTRAINT "FK_RoutingRules_Company" FOREIGN KEY ("CompanyId") REFERENCES "Companies"("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_RoutingRules_Department" FOREIGN KEY ("DepartmentId") REFERENCES "Departments"("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_RoutingRules_Category" FOREIGN KEY ("CategoryId") REFERENCES "Categories"("Id") ON DELETE SET NULL,
    CONSTRAINT "FK_RoutingRules_Assignee" FOREIGN KEY ("AssigneeUserId") REFERENCES "Users"("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_RoutingRules_CreatedBy" FOREIGN KEY ("CreatedById") REFERENCES "Users"("Id") ON DELETE RESTRICT,
    CONSTRAINT "FK_RoutingRules_UpdatedBy" FOREIGN KEY ("UpdatedById") REFERENCES "Users"("Id") ON DELETE SET NULL
  )
  `,
  `
  CREATE INDEX IF NOT EXISTS "IX_RoutingRules_Matching"
    ON "RoutingRules" ("IsActive", "CompanyId", "DepartmentId", "CategoryId", "Priority")
  `,
  `
  CREATE INDEX IF NOT EXISTS "IX_RoutingRules_Assignee"
    ON "RoutingRules" ("AssigneeUserId")
  `,
]

const routingRulesSelectSql = Prisma.sql`
  SELECT
    rr."Id" AS id,
    rr."Name" AS name,
    rr."Priority" AS priority,
    rr."IsActive" AS is_active,
    rr."CompanyId" AS company_id,
    company."Name" AS company,
    rr."DepartmentId" AS department_id,
    department."Name" AS department,
    rr."CategoryId" AS category_id,
    category."Name" AS category,
    rr."AssigneeUserId" AS assignee_user_id,
    assignee."FullName" AS assignee_name,
    rr."CreatedAt" AS created_at,
    rr."UpdatedAt" AS updated_at,
    creator."FullName" AS created_by_name,
    updater."FullName" AS updated_by_name
  FROM "RoutingRules" rr
  LEFT JOIN "Companies" company ON company."Id" = rr."CompanyId"
  LEFT JOIN "Departments" department ON department."Id" = rr."DepartmentId"
  LEFT JOIN "Categories" category ON category."Id" = rr."CategoryId"
  INNER JOIN "Users" assignee ON assignee."Id" = rr."AssigneeUserId"
  LEFT JOIN "Users" creator ON creator."Id" = rr."CreatedById"
  LEFT JOIN "Users" updater ON updater."Id" = rr."UpdatedById"
`

const normalizeRoutingRuleRow = (row: DbRoutingRuleRow): RoutingRuleRecord => ({
  ...row,
  created_at: row.created_at.toISOString(),
  updated_at: row.updated_at.toISOString(),
})

const assertValidScopeTargets = async ({
  companyId,
  departmentId,
  categoryId,
}: {
  companyId: number | null
  departmentId: number | null
  categoryId: number | null
}) => {
  const [company, department, category] = await Promise.all([
    companyId ? prisma.companies.findUnique({ where: { Id: companyId } }) : null,
    departmentId ? prisma.departments.findUnique({ where: { Id: departmentId } }) : null,
    categoryId ? prisma.categories.findUnique({ where: { Id: categoryId } }) : null,
  ])

  if (companyId && !company) throw new Error('Invalid company')
  if (departmentId && !department) throw new Error('Invalid department')
  if (categoryId && !category) throw new Error('Invalid category')
}

const ensureSupportAssignee = async (userId: number) => {
  const user = await prisma.users.findUnique({
    where: { Id: userId },
    include: { Roles: true },
  })

  const role = user?.Roles?.Name || ''
  if (!user || user.Status !== 'Active' || !['IT Staff', 'Admin'].includes(role)) {
    throw new Error('Assignee must be an active IT staff or admin user')
  }
}

export const ensureRoutingRulesTable = async () => {
  for (const statement of ensureRoutingRulesStatements) {
    await prisma.$executeRawUnsafe(statement)
  }
}

export const getRoutingRuleMeta = async (): Promise<RoutingRuleMeta> => {
  const [companies, departments, categories, users] = await Promise.all([
    prisma.companies.findMany({ where: { IsActive: true }, orderBy: { Name: 'asc' } }),
    prisma.departments.findMany({ where: { IsActive: true }, orderBy: { Name: 'asc' } }),
    prisma.categories.findMany({ where: { IsActive: true }, orderBy: { Name: 'asc' } }),
    prisma.users.findMany({ where: { Status: 'Active' }, include: { Roles: true }, orderBy: { FullName: 'asc' } }),
  ])

  return {
    companies: companies.map((company) => ({ id: company.Id, label: company.Name })),
    departments: departments.map((department) => ({ id: department.Id, label: department.Name })),
    categories: categories.map((category) => ({ id: category.Id, label: category.Name })),
    assignees: users
      .filter((user) => ['IT Staff', 'Admin'].includes(user.Roles?.Name || ''))
      .map((user) => ({
        id: user.Id,
        label: user.FullName,
        role: (user.Roles?.Name || '').toLowerCase().replace(' ', '_'),
      })),
  }
}

export const listRoutingRules = async (): Promise<RoutingRuleRecord[]> => {
  await ensureRoutingRulesTable()

  const rows = await prisma.$queryRaw<DbRoutingRuleRow[]>(Prisma.sql`
    ${routingRulesSelectSql}
    ORDER BY
      (CASE WHEN rr."CompanyId" IS NULL THEN 0 ELSE 1 END +
       CASE WHEN rr."DepartmentId" IS NULL THEN 0 ELSE 1 END +
       CASE WHEN rr."CategoryId" IS NULL THEN 0 ELSE 1 END) DESC,
      rr."Priority" ASC,
      rr."Id" ASC
  `)

  return rows.map(normalizeRoutingRuleRow)
}

export const getRoutingRuleById = async (ruleId: number): Promise<RoutingRuleRecord | null> => {
  await ensureRoutingRulesTable()

  const rows = await prisma.$queryRaw<DbRoutingRuleRow[]>(Prisma.sql`
    ${routingRulesSelectSql}
    WHERE rr."Id" = ${ruleId}
  `)

  return rows[0] ? normalizeRoutingRuleRow(rows[0]) : null
}

export const createRoutingRule = async (payload: RoutingRulePayload, actorUserId: number): Promise<RoutingRuleRecord> => {
  await ensureRoutingRulesTable()
  await assertValidScopeTargets({
    companyId: payload.company_id,
    departmentId: payload.department_id,
    categoryId: payload.category_id,
  })
  await ensureSupportAssignee(payload.assignee_user_id)

  const inserted = await prisma.$queryRaw<Array<{ id: number }>>(Prisma.sql`
    INSERT INTO "RoutingRules"
      ("Name", "CompanyId", "DepartmentId", "CategoryId", "AssigneeUserId", "Priority", "IsActive", "CreatedById", "UpdatedById")
    VALUES (
      ${payload.name},
      ${payload.company_id},
      ${payload.department_id},
      ${payload.category_id},
      ${payload.assignee_user_id},
      ${payload.priority},
      ${payload.is_active},
      ${actorUserId},
      ${actorUserId}
    )
    RETURNING "Id" AS id
  `)

  const rule = await getRoutingRuleById(inserted[0]?.id)
  if (!rule) throw new Error('Failed to create routing rule')
  return rule
}

export const updateRoutingRule = async (
  ruleId: number,
  payload: RoutingRulePayload,
  actorUserId: number
): Promise<RoutingRuleRecord> => {
  await ensureRoutingRulesTable()
  const existing = await getRoutingRuleById(ruleId)
  if (!existing) throw new Error('Routing rule not found')

  await assertValidScopeTargets({
    companyId: payload.company_id,
    departmentId: payload.department_id,
    categoryId: payload.category_id,
  })
  await ensureSupportAssignee(payload.assignee_user_id)

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "RoutingRules"
    SET
      "Name" = ${payload.name},
      "CompanyId" = ${payload.company_id},
      "DepartmentId" = ${payload.department_id},
      "CategoryId" = ${payload.category_id},
      "AssigneeUserId" = ${payload.assignee_user_id},
      "Priority" = ${payload.priority},
      "IsActive" = ${payload.is_active},
      "UpdatedAt" = CURRENT_TIMESTAMP,
      "UpdatedById" = ${actorUserId}
    WHERE "Id" = ${ruleId}
  `)

  const rule = await getRoutingRuleById(ruleId)
  if (!rule) throw new Error('Failed to update routing rule')
  return rule
}

export const deleteRoutingRule = async (ruleId: number) => {
  await ensureRoutingRulesTable()
  const existing = await getRoutingRuleById(ruleId)
  if (!existing) throw new Error('Routing rule not found')

  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "RoutingRules"
    WHERE "Id" = ${ruleId}
  `)
}

export const findMatchingRoutingRule = async ({
  companyId,
  departmentId,
  categoryId,
}: {
  companyId: number | null
  departmentId: number | null
  categoryId: number | null
}): Promise<RoutingRuleRecord | null> => {
  await ensureRoutingRulesTable()

  const rows = await prisma.$queryRaw<DbRoutingRuleRow[]>(Prisma.sql`
    ${routingRulesSelectSql}
    INNER JOIN "Roles" assigneeRole ON assigneeRole."Id" = assignee."RoleId"
    WHERE rr."IsActive" = TRUE
      AND assignee."Status" = 'Active'
      AND assigneeRole."Name" IN ('IT Staff', 'Admin')
      AND (rr."CompanyId" IS NULL OR rr."CompanyId" = ${companyId})
      AND (rr."DepartmentId" IS NULL OR rr."DepartmentId" = ${departmentId})
      AND (rr."CategoryId" IS NULL OR rr."CategoryId" = ${categoryId})
    ORDER BY
      (CASE WHEN rr."CompanyId" IS NULL THEN 0 ELSE 1 END +
       CASE WHEN rr."DepartmentId" IS NULL THEN 0 ELSE 1 END +
       CASE WHEN rr."CategoryId" IS NULL THEN 0 ELSE 1 END) DESC,
      rr."Priority" ASC,
      rr."Id" ASC
  `)

  return rows[0] ? normalizeRoutingRuleRow(rows[0]) : null
}
