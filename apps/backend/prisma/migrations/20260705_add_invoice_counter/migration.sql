-- Persist invoice numbering state per prefix and year.
CREATE TABLE "InvoiceCounter" (
  "id" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "currentSequence" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InvoiceCounter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InvoiceCounter_prefix_year_key"
ON "InvoiceCounter"("prefix", "year");

INSERT INTO "InvoiceCounter" ("id", "prefix", "year", "currentSequence", "createdAt", "updatedAt")
SELECT
  CONCAT(prefix, '-', year) AS "id",
  prefix,
  year,
  MAX(sequence) AS "currentSequence",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT
    split_part("number", '-', 1) AS prefix,
    split_part("number", '-', 2)::INTEGER AS year,
    split_part("number", '-', 3)::INTEGER AS sequence
  FROM "Invoice"
  WHERE "number" ~ '^[A-Z0-9]+-[0-9]{4}-[0-9]{4}$'
) AS invoice_numbers
GROUP BY prefix, year
ON CONFLICT ("prefix", "year") DO UPDATE
SET "currentSequence" = EXCLUDED."currentSequence",
    "updatedAt" = CURRENT_TIMESTAMP;
