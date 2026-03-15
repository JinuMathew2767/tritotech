import { Prisma } from '@prisma/client'
import { prisma } from '../db'

interface TicketDepartmentRow {
  ticket_id: number
  department_id: number
  department_name: string
}

export interface TicketDepartmentAccess {
  ids: number[]
  names: string[]
}

const ensureTicketDepartmentAccessStatements = [
  `
  CREATE TABLE IF NOT EXISTS "TicketDepartmentAccess" (
    "TicketId" INTEGER NOT NULL REFERENCES "Tickets"("Id") ON DELETE CASCADE,
    "DepartmentId" INTEGER NOT NULL REFERENCES "Departments"("Id") ON DELETE CASCADE,
    PRIMARY KEY ("TicketId", "DepartmentId")
  )
  `,
  `
  CREATE INDEX IF NOT EXISTS "IX_TicketDepartmentAccess_DepartmentId"
    ON "TicketDepartmentAccess" ("DepartmentId")
  `,
]

export const ensureTicketDepartmentAccessTable = async () => {
  for (const statement of ensureTicketDepartmentAccessStatements) {
    await prisma.$executeRawUnsafe(statement)
  }
}

export const getTicketDepartmentAccessMap = async (ticketIds: number[]): Promise<Map<number, TicketDepartmentAccess>> => {
  await ensureTicketDepartmentAccessTable()

  if (ticketIds.length === 0) {
    return new Map()
  }

  const rows = await prisma.$queryRaw<TicketDepartmentRow[]>(Prisma.sql`
    SELECT
      access."TicketId" AS ticket_id,
      access."DepartmentId" AS department_id,
      department."Name" AS department_name
    FROM "TicketDepartmentAccess" AS access
    INNER JOIN "Departments" AS department ON department."Id" = access."DepartmentId"
    WHERE access."TicketId" IN (${Prisma.join(ticketIds)})
    ORDER BY department."Name" ASC
  `)

  const map = new Map<number, TicketDepartmentAccess>()
  for (const row of rows) {
    const current = map.get(row.ticket_id) || { ids: [], names: [] }
    current.ids.push(row.department_id)
    current.names.push(row.department_name)
    map.set(row.ticket_id, current)
  }

  return map
}

export const syncTicketDepartmentAccess = async (ticketId: number, departmentIds: number[]) => {
  await ensureTicketDepartmentAccessTable()

  const normalizedDepartmentIds = Array.from(new Set(departmentIds.filter((value) => Number.isInteger(value) && value > 0)))

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM "TicketDepartmentAccess"
      WHERE "TicketId" = ${ticketId}
    `)

    if (!normalizedDepartmentIds.length) {
      return
    }

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "TicketDepartmentAccess" ("TicketId", "DepartmentId")
      VALUES ${Prisma.join(normalizedDepartmentIds.map((departmentId) => Prisma.sql`(${ticketId}, ${departmentId})`))}
    `)
  })
}
