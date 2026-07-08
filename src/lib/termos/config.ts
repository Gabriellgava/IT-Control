import { createHash, createPrivateKey } from 'node:crypto'

type GoogleDriveConfig = {
  clientEmail: string
  privateKey: string
  sharedDriveId: string
  rootFolderId: string
}

const SHARED_DRIVE_ID = '0AEcWwKcSvCUbUk9PVA'
const TERMOS_ROOT_FOLDER_ID = '1pzEKyp0mvmTVtBHaHggHwmwonARpQPLC'
const NOTA_FISCAL_ROOT_FOLDER_ID = '1slRnqGIs-QBOirrAdNx87RCHc4QXusre'

function required(name: string, value?: string) {
  if (!value?.trim()) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`)
  }

  return value
}

function parsePrivateKey(raw: string) {
  const value = raw.replace(/\\n/g, '\n').trim()

  if (!value.startsWith('-----BEGIN PRIVATE KEY-----') || !value.endsWith('-----END PRIVATE KEY-----')) {
    throw new Error('GOOGLE_PRIVATE_KEY inválida: formato PEM esperado (BEGIN/END PRIVATE KEY).')
  }

  return value
}

function validatePrivateKey(privateKey: string, clientEmail: string) {
  try {
    createPrivateKey({ key: privateKey, format: 'pem' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Falha ao validar GOOGLE_PRIVATE_KEY para ${clientEmail}: ${message}`)
  }
}

function debugConfig(cfg: GoogleDriveConfig) {
  if (process.env.DEBUG_GOOGLE_DRIVE !== 'true') return

  const fingerprint = createHash('sha256').update(cfg.privateKey).digest('hex').slice(0, 12)
  const hasPemHeader = cfg.privateKey.includes('BEGIN PRIVATE KEY')
  const hasPemFooter = cfg.privateKey.includes('END PRIVATE KEY')

  console.info('[google-drive][debug] Config carregada', {
    clientEmail: cfg.clientEmail,
    sharedDriveId: cfg.sharedDriveId,
    rootFolderId: cfg.rootFolderId,
    privateKeyLength: cfg.privateKey.length,
    privateKeyFingerprint: fingerprint,
    hasPemHeader,
    hasPemFooter,
    nodeVersion: process.version,
  })
}

export function getGoogleDriveConfig(): GoogleDriveConfig {
  const cfg: GoogleDriveConfig = {
    clientEmail: required('GOOGLE_CLIENT_EMAIL', process.env.GOOGLE_CLIENT_EMAIL),
    privateKey: parsePrivateKey(required('GOOGLE_PRIVATE_KEY', process.env.GOOGLE_PRIVATE_KEY)),
    sharedDriveId: SHARED_DRIVE_ID,
    rootFolderId: TERMOS_ROOT_FOLDER_ID,
  }

  validatePrivateKey(cfg.privateKey, cfg.clientEmail)
  debugConfig(cfg)

  return cfg
}

export function getNotaFiscalRootFolderId(): string {
  return NOTA_FISCAL_ROOT_FOLDER_ID
}
