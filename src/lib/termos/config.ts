import { createHash, createPrivateKey } from 'node:crypto'

type GoogleDriveConfig = {
  projectId: string
  clientEmail: string
  privateKey: string
  rootFolderId: string
}

function required(name: string, value?: string) {
  if (!value?.trim()) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`)
  }

  return value
}

function parsePrivateKey(raw: string) {
  const value = raw.trim()

  // A chave deve vir em formato PEM multilinha real (Vercel), sem "\\n".
  if (value.includes('\\n') || value.includes('\\r')) {
    throw new Error(
      'GOOGLE_PRIVATE_KEY inválida: detectado conteúdo escapado (\\n/\\r). Configure a chave em formato PEM multilinha real na Vercel.'
    )
  }

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
    projectId: cfg.projectId,
    clientEmail: cfg.clientEmail,
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
    projectId: required('GOOGLE_PROJECT_ID', process.env.GOOGLE_PROJECT_ID),
    clientEmail: required('GOOGLE_CLIENT_EMAIL', process.env.GOOGLE_CLIENT_EMAIL),
    privateKey: parsePrivateKey(required('GOOGLE_PRIVATE_KEY', process.env.GOOGLE_PRIVATE_KEY)),
    rootFolderId: required('GOOGLE_DRIVE_TERMOS_ROOT_FOLDER_ID', process.env.GOOGLE_DRIVE_TERMOS_ROOT_FOLDER_ID),
  }

  validatePrivateKey(cfg.privateKey, cfg.clientEmail)
  debugConfig(cfg)

  return cfg
}
