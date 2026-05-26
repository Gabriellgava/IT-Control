-- Refatoração profissional do fluxo de termos
ALTER TYPE "TermoStatus" RENAME VALUE 'RASCUNHO' TO 'PENDENTE';
ALTER TYPE "TermoStatus" RENAME VALUE 'ENVIADO' TO 'VISUALIZADO';
ALTER TYPE "TermoStatus" RENAME VALUE 'EXPIRADO' TO 'CANCELADO';

ALTER TABLE "termos"
  ADD COLUMN IF NOT EXISTS "token" TEXT,
  ADD COLUMN IF NOT EXISTS "signed_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "signer_ip" TEXT,
  ADD COLUMN IF NOT EXISTS "signer_user_agent" TEXT,
  ADD COLUMN IF NOT EXISTS "signer_name" TEXT,
  ADD COLUMN IF NOT EXISTS "signature_image_data_url" TEXT,
  ADD COLUMN IF NOT EXISTS "accepted_terms" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "drive_file_id" TEXT,
  ADD COLUMN IF NOT EXISTS "drive_file_link" TEXT;

UPDATE "termos" SET "token" = COALESCE("token", md5(random()::text || clock_timestamp()::text));
ALTER TABLE "termos" ALTER COLUMN "token" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "termos_token_key" ON "termos"("token");
