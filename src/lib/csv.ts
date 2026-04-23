import { corrigirMojibake } from '@/lib/texto'

export const decodificarCsvComFallback = async (arquivo: File) => {
  const buffer = await arquivo.arrayBuffer()

  const tentar = (encoding: string, fatal = false) => {
    try {
      return new TextDecoder(encoding, { fatal }).decode(buffer)
    } catch {
      return null
    }
  }

  return (
    tentar('utf-8', true) ??
    tentar('windows-1252') ??
    tentar('iso-8859-1') ??
    new TextDecoder('utf-8').decode(buffer)
  )
}

export { corrigirMojibake }
