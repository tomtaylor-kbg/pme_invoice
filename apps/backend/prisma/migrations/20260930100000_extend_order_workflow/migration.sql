ALTER TABLE "Order"
  ADD COLUMN "managerId" TEXT,
  ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN "dueDate" TIMESTAMP(3),
  ADD COLUMN "blockedReason" TEXT;

UPDATE "Order"
SET "status" = 'completed'
WHERE "status" = 'ready';

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_managerId_fkey"
  FOREIGN KEY ("managerId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Order_managerId_idx" ON "Order"("managerId");
