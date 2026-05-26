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

async function ensureFolderByName(parentId: string, folderName: string) {
  const safeName = sanitizeDriveName(folderName).replace(/'/g, "\\'")
  const q = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${safeName}' and trashed=false`

  debug('Buscando pasta', { parentId, folderName: safeName })

  const existing = await drive.files.list({ q, fields: 'files(id,name)', pageSize: 1 })
  if (existing.data.files?.[0]?.id) return existing.data.files[0].id

  const created = await drive.files.create({
    requestBody: {
      name: safeName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  })

  if (!created.data.id) {
    throw new Error(`Falha ao criar pasta '${safeName}' no Google Drive`)
  }

  return created.data.id
}

export async function ensureFuncionarioFolder(nome: string) {
  return ensureFolderByName(cfg.rootFolderId, nome)
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
  return ensureFolderByName(funcionarioFolderId, folderName)
}

export async function uploadPdf(folderId: string, fileName: string, data: Buffer) {
  debug('Enviando PDF', { folderId, fileName })

  const file = await drive.files.create({
    requestBody: { name: sanitizeDriveName(fileName), parents: [folderId] },
    media: { mimeType: 'application/pdf', body: Buffer.from(data) },
    fields: 'id, webViewLink, webContentLink',
  })

  if (!file.data.id) {
    throw new Error('Falha ao enviar PDF para o Google Drive')
  }

  return {
    fileId: file.data.id,
    link: file.data.webViewLink || file.data.webContentLink || null,
  }
}
