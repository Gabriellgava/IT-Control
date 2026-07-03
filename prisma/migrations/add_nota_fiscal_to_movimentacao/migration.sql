-- AlterTable
ALTER TABLE "movimentacoes" ADD COLUMN "nota_fiscal_drive_id" TEXT,
ADD COLUMN "nota_fiscal_drive_link" TEXT;

-- Drop old column if it exists (from previous attempt)
ALTER TABLE "movimentacoes" DROP COLUMN IF EXISTS "nota_fiscal_base64";


