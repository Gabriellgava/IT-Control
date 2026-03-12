export function formatMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

export function formatData(data: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date(data))
}

export function formatDataHora(data: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(data))
}

export function estoqueBaixo(quantidade: number, minimo: number): boolean {
  return quantidade <= minimo
}

export function exportarCSV(dados: Record<string, unknown>[], nomeArquivo: string) {
  if (typeof window === 'undefined') return
  const headers = Object.keys(dados[0] || {})
  const linhas = dados.map(row =>
    headers.map(h => {
      const val = row[h]
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val
    }).join(',')
  )
  const csv = [headers.join(','), ...linhas].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nomeArquivo}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
