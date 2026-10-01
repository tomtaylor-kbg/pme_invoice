ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'pending';
ALTER TABLE "Order" ADD COLUMN "operatorId" TEXT;
ALTER TABLE "Order" ADD COLUMN "proformaId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "orderId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "cashSessionId" TEXT;
ALTER TABLE "CashDisbursement" ADD COLUMN "cashSessionId" TEXT;

CREATE UNIQUE INDEX "Invoice_orderId_key" ON "Invoice"("orderId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_operatorId_idx" ON "Order"("operatorId");
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");

CREATE TABLE "CashRegisterSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "openingBalance" DECIMAL(65,30) NOT NULL,
  "closingBalance" DECIMAL(65,30),
  "expectedBalance" DECIMAL(65,30),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CashRegisterSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CashRegisterSession_userId_status_idx" ON "CashRegisterSession"("userId", "status");
CREATE INDEX "CashRegisterSession_status_openedAt_idx" ON "CashRegisterSession"("status", "openedAt");

CREATE TABLE "CashRegisterMovement" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "description" TEXT NOT NULL,
  "invoiceId" TEXT,
  "cashDisbursementId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CashRegisterMovement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CashRegisterMovement_sessionId_createdAt_idx" ON "CashRegisterMovement"("sessionId", "createdAt");
CREATE INDEX "CashRegisterMovement_invoiceId_idx" ON "CashRegisterMovement"("invoiceId");
CREATE INDEX "CashRegisterMovement_cashDisbursementId_idx" ON "CashRegisterMovement"("cashDisbursementId");

ALTER TABLE "Order" ADD CONSTRAINT "Order_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_proformaId_fkey" FOREIGN KEY ("proformaId") REFERENCES "Proforma"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashRegisterSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashDisbursement" ADD CONSTRAINT "CashDisbursement_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashRegisterSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashRegisterSession" ADD CONSTRAINT "CashRegisterSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashRegisterMovement" ADD CONSTRAINT "CashRegisterMovement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CashRegisterSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashRegisterMovement" ADD CONSTRAINT "CashRegisterMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
