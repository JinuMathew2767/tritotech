import { Prisma } from '@prisma/client'
import { prisma } from '../db'

interface UserDepartmentAccessRow {
  user_id: number
  department_id: number
  department_name: string
}

const ensureUserDepartmentAccessStatements = [
  `
  CREATE TABLE IF NOT EXISTS "UserDepartmentAccess" (
    "UserId" INTEGER NOT NULL REFERENCES "Users"("Id") ON DELETE CASCADE,
    "DepartmentId" INTEGER NOT NULL REFERENCES "Departments"("Id") ON DELETE CASCADE,
    PRIMARY KEY ("UserId", "DepartmentId")
  )
  `,
  `
  CREATE INDEX IF NOT EXISTS "IX_UserDepartmentAccess_DepartmentId"
    ON "UserDepartmentAccess" ("DepartmentId")
  `,
]

export interface UserDepartmentAccess {
  ids: number[]
  names: string[]
}

export type DepartmentAccessMode = 'global' | 'single' | 'multiple'

export const ensureUserDepartmentAccessTable = async () => {
  for (const statement of ensureUserDepartmentAccessStatements) {
    await prisma.$executeRawUnsafe(statement)
  }
}

export const getUserDepartmentAccessMap = async (userIds: number[]): Promise<Map<number, UserDepartmentAccess>> => {
  await ensureUserDepartmentAccessTable()

  if (userIds.length === 0) {
    return new Map()
  }

  const rows = await prisma.$queryRaw<UserDepartmentAccessRow[]>(Prisma.sql`
    SELECT
      access."UserId" AS user_id,
      access."DepartmentId" AS department_id,
      department."Name" AS department_name
    FROM "UserDepartmentAccess" AS access
    INNER JOIN "Departments" AS department ON department."Id" = access."DepartmentId"
    WHERE access."UserId" IN (${Prisma.join(userIds)})
    ORDER BY department."Name" ASC
  `)

  const map = new Map<number, UserDepartmentAccess>()
  for (const row of rows) {
    const current = map.get(row.user_id) || { ids: [], names: [] }
    current.ids.push(row.department_id)
    current.names.push(row.department_name)
    map.set(row.user_id, current)
  }
  return map
}

export const getUserDepartmentAccess = async (userId: number): Promise<UserDepartmentAccess> => {
  const map = await getUserDepartmentAccessMap([userId])
  return map.get(userId) || { ids: [], names: [] }
}

export const syncUserDepartmentAccess = async (userId: number, departmentIds: number[]) => {
  await ensureUserDepartmentAccessTable()

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM "UserDepartmentAccess"
      WHERE "UserId" = ${userId}
    `)

    if (departmentIds.length === 0) {
      return
    }

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "UserDepartmentAccess" ("UserId", "DepartmentId")
      VALUES ${Prisma.join(departmentIds.map((departmentId) => Prisma.sql`(${userId}, ${departmentId})`))}
    `)
  })
}

export const getDepartmentAccessMode = ({
  primaryDepartmentName,
  departmentAccessNames,
}: {
  primaryDepartmentName?: string | null
  departmentAccessNames: string[]
}): DepartmentAccessMode => {
  if (departmentAccessNames.length > 0) return 'multiple'
  if (primaryDepartmentName) return 'single'
  return 'global'
}

export const getDepartmentAccessNames = ({
  primaryDepartmentName,
  departmentAccessNames,
}: {
  primaryDepartmentName?: string | null
  departmentAccessNames: string[]
}) => {
  if (departmentAccessNames.length > 0) return departmentAccessNames
  if (primaryDepartmentName) return [primaryDepartmentName]
  return []
}
