ALTER TABLE "WorkspaceSetting" ADD COLUMN "exchangeRateCdfPerUsd" TEXT NOT NULL DEFAULT '2300';

ALTER TABLE "CashDeposit" ADD COLUMN "amountCdf" DECIMAL;
ALTER TABLE "CashDeposit" ADD COLUMN "amountUsd" DECIMAL;

UPDATE "CashDeposit" SET "amountCdf" = "amount" WHERE "currency" = 'CDF';
UPDATE "CashDeposit" SET "amountUsd" = "amount" WHERE "currency" = 'USD';

DROP INDEX "CashRegisterMovement_cashDepositId_key";
