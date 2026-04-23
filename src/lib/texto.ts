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

export const normalizarTexto = (valor: string | null | undefined) =>
  corrigirMojibake(valor ?? '').trim()
