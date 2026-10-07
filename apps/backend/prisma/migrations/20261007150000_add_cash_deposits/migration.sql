CREATE TABLE "CashDeposit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "userId" TEXT,
    "cashSessionId" TEXT,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "destination" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "validatedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CashDeposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CashDeposit_cashSessionId_fkey" FOREIGN KEY ("cashSessionId") REFERENCES "CashRegisterSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CashDeposit_number_key" ON "CashDeposit"("number");
CREATE INDEX "CashDeposit_status_createdAt_idx" ON "CashDeposit"("status", "createdAt");
CREATE INDEX "CashDeposit_cashSessionId_idx" ON "CashDeposit"("cashSessionId");

ALTER TABLE "CashRegisterMovement" ADD COLUMN "cashDepositId" TEXT;
CREATE UNIQUE INDEX "CashRegisterMovement_cashDepositId_key" ON "CashRegisterMovement"("cashDepositId");
CREATE INDEX "CashRegisterMovement_cashDepositId_idx" ON "CashRegisterMovement"("cashDepositId");
ALTER TABLE "CashRegisterMovement" ADD CONSTRAINT "CashRegisterMovement_cashDepositId_fkey" FOREIGN KEY ("cashDepositId") REFERENCES "CashDeposit" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CashDepositCounter" (
    "year" INTEGER NOT NULL PRIMARY KEY,
    "currentSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
