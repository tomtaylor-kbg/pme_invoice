-- Add template type for invoice documents
ALTER TABLE "Invoice"
ADD COLUMN "templateType" TEXT NOT NULL DEFAULT 'professional';

