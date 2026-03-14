ALTER TABLE "Tickets"
ADD COLUMN IF NOT EXISTS "CustomerExpectedResolutionAt" TIMESTAMP(3);

ALTER TABLE "Tickets"
ADD COLUMN IF NOT EXISTS "SupportExpectedResolutionAt" TIMESTAMP(3);
