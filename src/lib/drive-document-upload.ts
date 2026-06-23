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

// ────────────────────────────────────────────────────────────────────────────
// TIPOS
// ────────────────────────────────────────────────────────────────────────────

export type TipoDocumento = 'ATIVO' | 'LICENCA' | 'ASSINATURA'

export interface UploadDocumentoParams {
  tipo: TipoDocumento
  nomeItem: string // Ex: "Notebook Acer Nitro", "Office 365", "ChatGPT Team"
  dataCompra: Date
  arquivo: Buffer | Uint8Array
  nomeArquivo: string
}

export interface UploadDocumentoResult {
  driveFileId: string
  driveFileLink: string
  fileName: string
}

// ────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ────────────────────────────────────────────────────────────────────────────

function sanitizeDriveName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '-').trim()
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

function formatFolderDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

async function validateFileInSharedDrive(fileId: string, context: string) {
  const file = await drive.files.get({
    fileId,
    fields: 'id, name, driveId, parents, webViewLink, webContentLink',
    supportsAllDrives: true,
  })

  if (file.data.driveId !== cfg.sharedDriveId) {
    throw new Error(
      `Arquivo '${fileId}' (${context}) não foi criado no Shared Drive. driveId: ${file.data.driveId ?? 'ausente'}`
    )
  }

  return file.data
}

// ────────────────────────────────────────────────────────────────────────────
// GERENCIAMENTO DE PASTAS
// ────────────────────────────────────────────────────────────────────────────

async function ensureFolderByName(
  parentId: string,
  folderName: string,
  context: string
): Promise<string> {
  const safeName = sanitizeDriveName(folderName)
  const escapedName = escapeDriveQueryValue(safeName)
  const query = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false`

  console.log(`[DRIVE] Buscando pasta: ${context}`, { parentId, folderName: safeName })

  const existing = await drive.files.list({
    q: query,
    fields: 'files(id, name, driveId, parents)',
    pageSize: 1,
    corpora: 'drive',
    driveId: cfg.sharedDriveId,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  })

  const existingFolder = existing.data.files?.[0]
  if (existingFolder?.id) {
    if (existingFolder.driveId !== cfg.sharedDriveId) {
      throw new Error(
        `Pasta '${safeName}' encontrada fora do Shared Drive. driveId: ${existingFolder.driveId ?? 'ausente'}`
      )
    }
    console.log(`[DRIVE] Pasta encontrada: ${context}`, { id: existingFolder.id })
    return existingFolder.id
  }

  console.log(`[DRIVE] Criando pasta: ${context}`, { parentId, folderName: safeName })

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

  const validated = await validateFileInSharedDrive(created.data.id, `pasta ${context}`)
  console.log(`[DRIVE] Pasta criada: ${context}`, { id: validated.id })

  return created.data.id
}

async function ensureRootCategoryFolder(tipoDocumento: TipoDocumento): Promise<string> {
  const categoryNames = {
    ATIVO: 'Ativos',
    LICENCA: 'Licencas',
    ASSINATURA: 'Assinaturas',
  }

  return ensureFolderByName(cfg.rootFolderId, categoryNames[tipoDocumento], `categoria ${tipoDocumento}`)
}

async function ensureItemFolder(
  tipoDocumento: TipoDocumento,
  nomeItem: string
): Promise<string> {
  const categoryFolderId = await ensureRootCategoryFolder(tipoDocumento)
  return ensureFolderByName(categoryFolderId, nomeItem, `item ${tipoDocumento}/${nomeItem}`)
}

async function ensureDocumentoFolder(
  tipoDocumento: TipoDocumento,
  nomeItem: string
): Promise<string> {
  const itemFolderId = await ensureItemFolder(tipoDocumento, nomeItem)
  return ensureFolderByName(itemFolderId, 'Nota Fiscal', `documento ${tipoDocumento}/${nomeItem}`)
}

async function ensureDateFolder(
  tipoDocumento: TipoDocumento,
  nomeItem: string,
  dataCompra: Date
): Promise<string> {
  const documentoFolderId = await ensureDocumentoFolder(tipoDocumento, nomeItem)
  const dateFolderName = formatFolderDate(dataCompra)
  return ensureFolderByName(documentoFolderId, dateFolderName, `data ${dateFolderName}`)
}

// ────────────────────────────────────────────────────────────────────────────
// UPLOAD DE ARQUIVO
// ────────────────────────────────────────────────────────────────────────────

export async function uploadDocumento(
  params: UploadDocumentoParams
): Promise<UploadDocumentoResult> {
  console.log('[DRIVE] Iniciando upload de documento', {
    tipo: params.tipo,
    nomeItem: params.nomeItem,
    nomeArquivo: params.nomeArquivo,
    tamanhoBytes: params.arquivo.length,
  })

  // Criar estrutura de pastas
  const dateFolderId = await ensureDateFolder(
    params.tipo,
    params.nomeItem,
    params.dataCompra
  )

  // Upload do arquivo
  const safeName = sanitizeDriveName(params.nomeArquivo)
  const buffer = Buffer.isBuffer(params.arquivo) ? params.arquivo : Buffer.from(params.arquivo)
  const stream = Readable.from(buffer)

  console.log('[DRIVE] Enviando arquivo para Drive', {
    pasta: dateFolderId,
    arquivo: safeName,
    bytes: buffer.length,
  })

  const file = await drive.files.create({
    requestBody: {
      name: safeName,
      parents: [dateFolderId],
    },
    media: {
      mimeType: 'application/octet-stream',
      body: stream,
    },
    fields: 'id, name, driveId, parents, webViewLink, webContentLink',
    supportsAllDrives: true,
  })

  if (!file.data.id) {
    throw new Error('Falha ao enviar documento para o Google Drive')
  }

  const uploadedFile = await validateFileInSharedDrive(file.data.id, 'upload documento')
  const fileId = uploadedFile.id ?? file.data.id
  const fileLink = uploadedFile.webViewLink || uploadedFile.webContentLink || ''

  console.log('[DRIVE] Upload concluído', {
    fileId,
    fileName: uploadedFile.name,
    webViewLink: uploadedFile.webViewLink,
  })

  return {
    driveFileId: fileId,
    driveFileLink: fileLink,
    fileName: safeName,
  }
}
