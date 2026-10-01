ALTER TABLE "CashRegisterSession" ADD COLUMN "openingBalances" JSONB;
ALTER TABLE "CashRegisterSession" ADD COLUMN "closingBalances" JSONB;
ALTER TABLE "CashRegisterSession" ADD COLUMN "expectedBalances" JSONB;
