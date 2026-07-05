-- Add client type to distinguish individuals from companies.
ALTER TABLE "Client"
ADD COLUMN "clientType" TEXT NOT NULL DEFAULT 'individual';

UPDATE "Client"
SET "clientType" = CASE
  WHEN COALESCE(TRIM("company"), '') <> '' THEN 'company'
  ELSE 'individual'
END;
