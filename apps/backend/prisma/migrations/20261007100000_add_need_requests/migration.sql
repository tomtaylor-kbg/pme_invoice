CREATE TABLE "NeedRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "userId" TEXT,
    "department" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "issueDate" TIMESTAMP(3) NOT NULL,
    "total" DECIMAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "notes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NeedRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "NeedRequest_number_key" ON "NeedRequest"("number");
CREATE INDEX "NeedRequest_status_idx" ON "NeedRequest"("status");
CREATE INDEX "NeedRequest_issueDate_idx" ON "NeedRequest"("issueDate");

CREATE TABLE "NeedRequestLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "needRequestId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'unité',
    "unitPrice" DECIMAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NeedRequestLine_needRequestId_fkey" FOREIGN KEY ("needRequestId") REFERENCES "NeedRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "NeedRequestLine_needRequestId_idx" ON "NeedRequestLine"("needRequestId");

CREATE TABLE "NeedRequestCounter" (
    "year" INTEGER NOT NULL PRIMARY KEY,
    "currentSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

ALTER TABLE "CashDisbursement" ADD COLUMN "needRequestId" TEXT;
CREATE UNIQUE INDEX "CashDisbursement_needRequestId_not_null_key" ON "CashDisbursement"("needRequestId") WHERE "needRequestId" IS NOT NULL;
