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

export const corrigirMojibake = (texto: string) => {
  if (!texto || !/[ÃÂ][\x80-\xBF]/.test(texto)) return texto

  try {
    const bytes = Uint8Array.from(texto, (char) => char.charCodeAt(0))
    const corrigido = new TextDecoder('utf-8').decode(bytes)
    return corrigido.includes('�') ? texto : corrigido
  } catch {
    return texto
  }
}
