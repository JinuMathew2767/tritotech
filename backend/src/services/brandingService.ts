import { Prisma } from '@prisma/client'
import { prisma } from '../db'

export interface BrandingSettingsRecord {
  appName: string
  timezone: string
  logoDataUrl: string | null
  updatedAt: string
}

interface DbBrandingSettingsRow {
  app_name: string
  timezone: string
  logo_data_url: string | null
  updated_at: Date
}

export const DEFAULT_BRANDING_SETTINGS = {
  appName: 'Triton IT Support',
  timezone: 'Asia/Dubai',
  logoDataUrl: null as string | null,
}

const ensureBrandingStatements = [
  `
  CREATE TABLE IF NOT EXISTS "BrandingSettings" (
    "Id" INTEGER PRIMARY KEY,
    "AppName" VARCHAR(150) NOT NULL DEFAULT 'Triton IT Support',
    "Timezone" VARCHAR(80) NOT NULL DEFAULT 'Asia/Dubai',
    "LogoDataUrl" TEXT,
    "UpdatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
  `,
  `
  INSERT INTO "BrandingSettings" ("Id", "AppName", "Timezone", "LogoDataUrl")
  VALUES (1, 'Triton IT Support', 'Asia/Dubai', NULL)
  ON CONFLICT ("Id") DO NOTHING
  `,
]

const normalizeBrandingPayload = (payload: {
  appName?: string | null
  timezone?: string | null
  logoDataUrl?: string | null
}): Omit<BrandingSettingsRecord, 'updatedAt'> => ({
  appName: String(payload.appName ?? '').trim() || DEFAULT_BRANDING_SETTINGS.appName,
  timezone: String(payload.timezone ?? '').trim() || DEFAULT_BRANDING_SETTINGS.timezone,
  logoDataUrl: payload.logoDataUrl ? String(payload.logoDataUrl) : null,
})

const formatBrandingRow = (row: DbBrandingSettingsRow): BrandingSettingsRecord => ({
  appName: row.app_name || DEFAULT_BRANDING_SETTINGS.appName,
  timezone: row.timezone || DEFAULT_BRANDING_SETTINGS.timezone,
  logoDataUrl: row.logo_data_url || null,
  updatedAt: row.updated_at.toISOString(),
})

export const ensureBrandingSettingsTable = async () => {
  for (const statement of ensureBrandingStatements) {
    await prisma.$executeRawUnsafe(statement)
  }
}

export const getBrandingSettings = async (): Promise<BrandingSettingsRecord> => {
  await ensureBrandingSettingsTable()

  const rows = await prisma.$queryRaw<DbBrandingSettingsRow[]>(Prisma.sql`
    SELECT
      "AppName" AS app_name,
      "Timezone" AS timezone,
      "LogoDataUrl" AS logo_data_url,
      "UpdatedAt" AS updated_at
    FROM "BrandingSettings"
    WHERE "Id" = 1
    LIMIT 1
  `)

  if (!rows[0]) {
    return {
      ...DEFAULT_BRANDING_SETTINGS,
      updatedAt: new Date(0).toISOString(),
    }
  }

  return formatBrandingRow(rows[0])
}

export const updateBrandingSettings = async (payload: {
  appName?: string | null
  timezone?: string | null
  logoDataUrl?: string | null
}): Promise<BrandingSettingsRecord> => {
  await ensureBrandingSettingsTable()
  const next = normalizeBrandingPayload(payload)

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "BrandingSettings" ("Id", "AppName", "Timezone", "LogoDataUrl", "UpdatedAt")
    VALUES (1, ${next.appName}, ${next.timezone}, ${next.logoDataUrl}, CURRENT_TIMESTAMP)
    ON CONFLICT ("Id") DO UPDATE
    SET
      "AppName" = EXCLUDED."AppName",
      "Timezone" = EXCLUDED."Timezone",
      "LogoDataUrl" = EXCLUDED."LogoDataUrl",
      "UpdatedAt" = CURRENT_TIMESTAMP
  `)

  return getBrandingSettings()
}
