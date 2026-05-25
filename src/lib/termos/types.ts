export type SignatureType = 'drawn' | 'typed'

export interface TermoCreatePayload {
  titulo: string
  conteudoHtml: string
  funcionarioId: string
  criadoPorId?: string
  validadeHoras?: number
}
