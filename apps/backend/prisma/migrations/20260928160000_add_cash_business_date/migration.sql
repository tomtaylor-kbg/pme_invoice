ALTER TABLE "CashRegisterSession" ADD COLUMN "businessDate" DATE NOT NULL DEFAULT CURRENT_DATE;
CREATE INDEX "CashRegisterSession_userId_businessDate_idx" ON "CashRegisterSession"("userId", "businessDate");
