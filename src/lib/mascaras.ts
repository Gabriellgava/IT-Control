// Aplica máscara de telefone: (11) 99999-9999 ou (11) 9999-9999
export function mascaraTelefone(valor: string): string {
  const nums = valor.replace(/\D/g, '').slice(0, 11)
  if (nums.length <= 10) {
    return nums
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return nums
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

// Remove máscara para salvar no banco
export function limparTelefone(valor: string): string {
  return valor.replace(/\D/g, '')
}
