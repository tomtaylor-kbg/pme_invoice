ALTER TABLE "CashDisbursement"
  ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'disbursement',
  ADD COLUMN IF NOT EXISTS "settlementAmount" DECIMAL,
  ADD COLUMN IF NOT EXISTS "settlementCurrency" TEXT,
  ADD COLUMN IF NOT EXISTS "exchangeRate" DECIMAL;

CREATE INDEX IF NOT EXISTS "CashDisbursement_kind_paidAt_idx"
  ON "CashDisbursement" ("kind", "paidAt");
