-- RemoveConstraint and drop columns from movimentacoes
ALTER TABLE "movimentacoes" 
DROP COLUMN IF EXISTS "nota_fiscal_file_name",
DROP COLUMN IF EXISTS "nota_fiscal_drive_id",
DROP COLUMN IF EXISTS "nota_fiscal_drive_link";

-- AddColumn to documentos
ALTER TABLE "documentos" 
ADD COLUMN "movimentacao_id" TEXT;

-- CreateIndex
CREATE INDEX "documentos_movimentacao_id_idx" ON "documentos"("movimentacao_id");

-- AddForeignKey
ALTER TABLE "documentos" 
ADD CONSTRAINT "documentos_movimentacao_id_fkey" 
FOREIGN KEY ("movimentacao_id") REFERENCES "movimentacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
