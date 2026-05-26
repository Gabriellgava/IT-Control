function required(name: string, value?: string) {
  if (!value?.trim()) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`)
  }
  return value
}

function normalizePrivateKey(raw: string) {
  const trimmed = raw.trim()
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed

  return unquoted.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
}

export function getGoogleDriveConfig() {
  const projectId = required('GOOGLE_PROJECT_ID', process.env.GOOGLE_PROJECT_ID)
  const clientEmail = required(
    'GOOGLE_CLIENT_EMAIL (ou GOOGLE_SERVICE_ACCOUNT_EMAIL)',
    process.env.GOOGLE_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  )
  const privateKeyRaw = required(
    'GOOGLE_PRIVATE_KEY (ou GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)',
    process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  )
  const rootFolderId = required('GOOGLE_DRIVE_TERMOS_ROOT_FOLDER_ID', process.env.GOOGLE_DRIVE_TERMOS_ROOT_FOLDER_ID)

  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKeyRaw),
    rootFolderId,
  }
}
