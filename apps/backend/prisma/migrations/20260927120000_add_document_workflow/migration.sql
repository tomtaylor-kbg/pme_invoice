ALTER TABLE "DeliveryNote" ADD COLUMN "orderId" TEXT;
ALTER TABLE "DeliveryNote" ADD COLUMN "deliveryAddress" TEXT;
ALTER TABLE "DeliveryNote" ADD COLUMN "deliveredBy" TEXT;
ALTER TABLE "DeliveryNote" ADD COLUMN "receivedBy" TEXT;
ALTER TABLE "DeliveryNote" ADD COLUMN "receivedAt" TIMESTAMP(3);
ALTER TABLE "DeliveryNote" ADD COLUMN "signatureDataUrl" TEXT;
ALTER TABLE "DeliveryNoteLine" ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'unité';

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "userId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "issueDate" TIMESTAMP(3) NOT NULL,
  "total" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");
CREATE TABLE "OrderLine" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'unité',
  "unitPrice" DECIMAL(65,30) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "OrderCounter" (
  "year" INTEGER NOT NULL,
  "currentSequence" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderCounter_pkey" PRIMARY KEY ("year")
);
CREATE TABLE "DeliveryInvoiceLink" (
  "deliveryNoteId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeliveryInvoiceLink_pkey" PRIMARY KEY ("deliveryNoteId", "invoiceId")
);
CREATE INDEX "DeliveryInvoiceLink_invoiceId_idx" ON "DeliveryInvoiceLink"("invoiceId");
CREATE TABLE "Receipt" (
  "id" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  "method" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL,
  "balanceDue" DECIMAL(65,30) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Receipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Receipt_number_key" ON "Receipt"("number");
CREATE UNIQUE INDEX "Receipt_paymentId_key" ON "Receipt"("paymentId");
CREATE TABLE "ReceiptCounter" (
  "year" INTEGER NOT NULL,
  "currentSequence" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReceiptCounter_pkey" PRIMARY KEY ("year")
);
ALTER TABLE "DeliveryNote" ADD CONSTRAINT "DeliveryNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryInvoiceLink" ADD CONSTRAINT "DeliveryInvoiceLink_deliveryNoteId_fkey" FOREIGN KEY ("deliveryNoteId") REFERENCES "DeliveryNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeliveryInvoiceLink" ADD CONSTRAINT "DeliveryInvoiceLink_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
