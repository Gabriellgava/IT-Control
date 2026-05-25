import { google } from 'googleapis'
import { getGoogleDriveConfig } from '@/lib/termos/config'

function getDrive() {
  const cfg = getGoogleDriveConfig()
  const auth = new google.auth.GoogleAuth({
    credentials: {
      project_id: cfg.projectId,
      client_email: cfg.clientEmail,
      private_key: cfg.privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  })

  return { drive: google.drive({ version: 'v3', auth }), cfg }
}

function sanitizeDriveName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '-').trim()
}

async function ensureFolderByName(parentId: string, folderName: string) {
  const { drive } = getDrive()
  const safeName = sanitizeDriveName(folderName).replace(/'/g, "\\'")
  const q = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${safeName}' and trashed=false`

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
  const { cfg } = getDrive()
  return ensureFolderByName(cfg.rootFolderId, nome)
}

export async function ensureTermoFolder(funcionarioFolderId: string, termoId: string) {
  return ensureFolderByName(funcionarioFolderId, `termo-${termoId}`)
}

export async function uploadPdf(folderId: string, fileName: string, data: Buffer) {
  const { drive } = getDrive()

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
