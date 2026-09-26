CREATE TABLE "Proforma" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "issueDate" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(65,30) NOT NULL DEFAULT 20,
    "notes" TEXT,
    "convertedInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Proforma_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProformaLine" (
    "id" TEXT NOT NULL,
    "proformaId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProformaLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProformaCounter" (
    "year" INTEGER NOT NULL,
    "currentSequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProformaCounter_pkey" PRIMARY KEY ("year")
);

CREATE UNIQUE INDEX "Proforma_number_key" ON "Proforma"("number");
CREATE UNIQUE INDEX "Proforma_convertedInvoiceId_key" ON "Proforma"("convertedInvoiceId");
CREATE INDEX "Proforma_clientId_idx" ON "Proforma"("clientId");
CREATE INDEX "Proforma_userId_idx" ON "Proforma"("userId");
CREATE INDEX "ProformaLine_proformaId_idx" ON "ProformaLine"("proformaId");
ALTER TABLE "Proforma" ADD CONSTRAINT "Proforma_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Proforma" ADD CONSTRAINT "Proforma_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProformaLine" ADD CONSTRAINT "ProformaLine_proformaId_fkey" FOREIGN KEY ("proformaId") REFERENCES "Proforma"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Proforma" ADD CONSTRAINT "Proforma_convertedInvoiceId_fkey" FOREIGN KEY ("convertedInvoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
