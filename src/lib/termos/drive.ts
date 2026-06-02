import { Readable } from 'stream'
import { google } from 'googleapis'
import { getGoogleDriveConfig } from '@/lib/termos/config'

const cfg = getGoogleDriveConfig()

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: cfg.clientEmail,
    private_key: cfg.privateKey,
  },
  scopes: ['https://www.googleapis.com/auth/drive'],
})

export const drive = google.drive({
  version: 'v3',
  auth,
})

function debug(message: string, data?: Record<string, unknown>) {
  if (process.env.DEBUG_GOOGLE_DRIVE !== 'true') return
  console.info(`[google-drive][debug] ${message}`, data ?? {})
}

function sanitizeDriveName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '-').trim()
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function logSharedDriveUsage() {
  console.log('[DRIVE] shared drive id', cfg.sharedDriveId)
  console.log('[DRIVE] root folder id', cfg.rootFolderId)
  console.log('[DRIVE] usando shared drive', {
    sharedDriveId: cfg.sharedDriveId,
    rootFolderId: cfg.rootFolderId,
  })
}

async function validateFileInSharedDrive(fileId: string, context: string) {
  const file = await drive.files.get({
    fileId,
    fields: 'id, name, driveId, parents, webViewLink, webContentLink',
    supportsAllDrives: true,
  })

  if (file.data.driveId !== cfg.sharedDriveId) {
    throw new Error(
      `Arquivo/pasta '${fileId}' (${context}) não foi criado no Shared Drive Inventário. driveId retornado: ${file.data.driveId ?? 'ausente'}`
    )
  }

  return file.data
}

async function ensureFolderByName(parentId: string, folderName: string, logLabel: 'colaborador' | 'termo') {
  const safeName = sanitizeDriveName(folderName)
  const escapedName = escapeDriveQueryValue(safeName)
  const q = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false`

  if (logLabel === 'colaborador') {
    console.log('[DRIVE] criando pasta colaborador', { parentId, folderName: safeName })
  } else {
    console.log('[DRIVE] criando pasta termo', { parentId, folderName: safeName })
  }

  console.log('[DRIVE] findFolder antes', {
    sharedDriveId: cfg.sharedDriveId,
    parentId,
    folderName: safeName,
    query: q,
  })
  debug('Buscando pasta no Shared Drive', { sharedDriveId: cfg.sharedDriveId, parentId, folderName: safeName })

  const existing = await drive.files.list({
    q,
    fields: 'files(id,name,driveId,parents)',
    pageSize: 1,
    corpora: 'drive',
    driveId: cfg.sharedDriveId,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })
  console.log('[DRIVE] findFolder depois', { total: existing.data.files?.length ?? 0, parentId, folderName: safeName })

  const existingFolder = existing.data.files?.[0]
  if (existingFolder?.id) {
    if (existingFolder.driveId !== cfg.sharedDriveId) {
      throw new Error(
        `Pasta '${safeName}' encontrada fora do Shared Drive Inventário. driveId retornado: ${existingFolder.driveId ?? 'ausente'}`
      )
    }

    console.log('[DRIVE] pasta encontrada no shared drive', {
      id: existingFolder.id,
      parentId,
      folderName: safeName,
      sharedDriveId: existingFolder.driveId,
    })
    return existingFolder.id
  }

  console.log('[DRIVE] createFolder antes', { sharedDriveId: cfg.sharedDriveId, parentId, folderName: safeName })
  const created = await drive.files.create({
    requestBody: {
      name: safeName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id, name, driveId, parents',
    supportsAllDrives: true,
  })

  if (!created.data.id) {
    throw new Error(`Falha ao criar pasta '${safeName}' no Google Drive`)
  }

  const createdFolder = await validateFileInSharedDrive(created.data.id, `pasta ${logLabel}`)
  console.log('[DRIVE] pasta criada no shared drive', {
    parentId,
    folderName: safeName,
    id: createdFolder.id,
    sharedDriveId: createdFolder.driveId,
  })

  return created.data.id
}

export function getDriveStorageConfig() {
  return {
    sharedDriveId: cfg.sharedDriveId,
    rootFolderId: cfg.rootFolderId,
  }
}

export async function ensureFuncionarioFolder(nome: string) {
  logSharedDriveUsage()
  return ensureFolderByName(cfg.rootFolderId, nome, 'colaborador')
}

function formatFolderDate(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export async function ensureTermoFolder(funcionarioFolderId: string, termoDate: Date) {
  const folderName = `Termo de Ativos - ${formatFolderDate(termoDate)}`
  return ensureFolderByName(funcionarioFolderId, folderName, 'termo')
}

export async function uploadPdf(folderId: string, fileName: string, data: Buffer | Uint8Array) {
  console.log('[DRIVE] upload pdf iniciado', {
    sharedDriveId: cfg.sharedDriveId,
    folderId,
    fileName,
    bytes: data.length,
  })
  debug('Enviando PDF para Shared Drive', { sharedDriveId: cfg.sharedDriveId, folderId, fileName })

  const pdfBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data)
  const stream = Readable.from(pdfBuffer)

  const file = await drive.files.create({
    requestBody: { name: sanitizeDriveName(fileName), parents: [folderId] },
    media: { mimeType: 'application/pdf', body: stream },
    fields: 'id, name, driveId, parents, webViewLink, webContentLink',
    supportsAllDrives: true,
  })

  if (!file.data.id) {
    throw new Error('Falha ao enviar PDF para o Google Drive')
  }

  const uploadedFile = await validateFileInSharedDrive(file.data.id, 'upload pdf')
  const link = uploadedFile.webViewLink || uploadedFile.webContentLink || null

  console.log('[DRIVE] upload pdf concluído', {
    sharedDriveId: uploadedFile.driveId,
    folderId,
    fileName,
    fileId: uploadedFile.id,
    webViewLink: uploadedFile.webViewLink ?? null,
  })
  console.log('[DRIVE] fileId', uploadedFile.id)
  console.log('[DRIVE] webViewLink', uploadedFile.webViewLink ?? null)

  return {
    fileId: uploadedFile.id,
    link,
  }
}
