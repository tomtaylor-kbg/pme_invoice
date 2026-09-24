CREATE TABLE "CashDisbursement" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "userId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "category" TEXT NOT NULL,
    "beneficiary" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CashDisbursement_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CashDisbursement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CashDisbursement_number_key" ON "CashDisbursement"("number");

CREATE TABLE "CashDisbursementCounter" (
    "year" INTEGER NOT NULL,
    "currentSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CashDisbursementCounter_pkey" PRIMARY KEY ("year")
);
