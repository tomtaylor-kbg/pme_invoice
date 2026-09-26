ALTER TABLE "WorkspaceSetting"
ADD COLUMN "setupCompleted" BOOLEAN NOT NULL DEFAULT false;

UPDATE "WorkspaceSetting"
SET "setupCompleted" = true
WHERE btrim("companyName") <> ''
  AND "companyName" <> 'Mon entreprise';
