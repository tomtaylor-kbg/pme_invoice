ALTER TABLE "CashRegisterMovement" ADD COLUMN "paymentId" TEXT;

CREATE UNIQUE INDEX "CashRegisterMovement_paymentId_key" ON "CashRegisterMovement"("paymentId");
CREATE UNIQUE INDEX "CashRegisterMovement_cashDisbursementId_key" ON "CashRegisterMovement"("cashDisbursementId");

ALTER TABLE "CashRegisterMovement"
ADD CONSTRAINT "CashRegisterMovement_paymentId_fkey"
FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CashRegisterMovement"
ADD CONSTRAINT "CashRegisterMovement_cashDisbursementId_fkey"
FOREIGN KEY ("cashDisbursementId") REFERENCES "CashDisbursement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
