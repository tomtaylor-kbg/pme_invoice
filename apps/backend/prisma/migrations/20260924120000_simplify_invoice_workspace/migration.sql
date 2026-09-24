-- Keep historical receipt-shaped invoices as standard invoices.
UPDATE "Invoice"
SET "templateType" = 'professional'
WHERE "templateType" = 'receipt';

ALTER TABLE "Invoice" DROP COLUMN "templateType";
DROP TABLE IF EXISTS "Receipt";

ALTER TABLE "WorkspaceSetting"
ADD COLUMN "businessSector" TEXT NOT NULL DEFAULT 'Imprimerie';

UPDATE "WorkspaceSetting"
SET "companyName" = 'Mon entreprise'
WHERE "companyName" = 'Facturation Interne';

ALTER TABLE "WorkspaceSetting" DROP COLUMN "services";
