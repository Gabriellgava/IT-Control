import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer
} from '@react-pdf/renderer'
import React from 'react'
import { normalizarTexto } from '@/lib/texto'

type TermoItem = { descricao: string; tipo: string; etiqueta: string }

export interface BuildTermoPdfParams {
  termoId: string
  titulo: string
  texto: string
  empresa?: string
  colaborador?: string
  colaboradorEmail?: string | null
  setores?: string[]
  dataEntrega?: string
  dataDevolucao?: string
  observacoes?: string
  itens?: TermoItem[]
  assinaturaTexto?: string
  assinaturaImagemDataUrl?: string | null
  assinadorIp?: string
  assinadoEm?: Date
}

Font.register({ family: 'Helvetica' })

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, paddingTop: 28, paddingHorizontal: 28, paddingBottom: 48, color: '#111827' },
  header: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#D1D5DB', paddingBottom: 8 },
  company: { fontSize: 12, color: '#374151' },
  title: { fontSize: 16, marginTop: 4, fontWeight: 700 as any },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 11, marginBottom: 6, fontWeight: 700 as any, color: '#111827' },
  row: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 130, color: '#6B7280' },
  value: { flex: 1 },
  paragraph: { lineHeight: 1.35, textAlign: 'justify' },
  table: { borderWidth: 1, borderColor: '#D1D5DB', marginTop: 4 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#D1D5DB' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  colDesc: { flex: 5, padding: 6 },
  colType: { flex: 2, padding: 6, borderLeftWidth: 1, borderLeftColor: '#E5E7EB' },
  colTag: { flex: 2, padding: 6, borderLeftWidth: 1, borderLeftColor: '#E5E7EB' },
  signatureBox: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 4, padding: 8, marginTop: 8 },
  signatureImage: { width: 180, height: 54, objectFit: 'contain' },
  footer: { position: 'absolute', bottom: 18, left: 28, right: 28, fontSize: 8, color: '#6B7280', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 6 }
})

function stripHtml(value: string) {
  return normalizarTexto(value.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' '))
}

function extractTableItems(html: string): TermoItem[] {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  const parsed = rows
    .map((row) => {
      const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => stripHtml(cell[1]))
      if (cells.length < 3) return null
      return { descricao: cells[0], tipo: cells[1], etiqueta: cells[2] }
    })
    .filter((item): item is TermoItem => Boolean(item && item.descricao && item.tipo && item.etiqueta))
  return parsed.slice(0, 100)
}

export async function buildTermoPdf(params: BuildTermoPdfParams) {
  const signedAt = params.assinadoEm ?? new Date()
  const cleanText = stripHtml(params.texto)
  const fallbackItems = extractTableItems(params.texto)
  const items = (params.itens?.length ? params.itens : fallbackItems).slice(0, 40)
  const payloadHash = createHash('sha256')
    .update(JSON.stringify({ termoId: params.termoId, signedAt: signedAt.toISOString(), signer: params.assinaturaTexto ?? '', texto: cleanText }))
    .digest('hex')

  const doc = (
    <Document title={params.titulo} author={params.empresa || 'IT Control'} language="pt-BR">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.company}>{params.empresa || 'IT Control'}</Text>
          <Text style={styles.title}>{normalizarTexto(params.titulo)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do colaborador</Text>
          <View style={styles.row}><Text style={styles.label}>Nome</Text><Text style={styles.value}>{normalizarTexto(params.colaborador || '-')}</Text></View>
          <View style={styles.row}><Text style={styles.label}>E-mail</Text><Text style={styles.value}>{normalizarTexto(params.colaboradorEmail || '-')}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Setor(es)</Text><Text style={styles.value}>{normalizarTexto(params.setores?.join(', ') || '-')}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Data de entrega</Text><Text style={styles.value}>{normalizarTexto(params.dataEntrega || '-')}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Data devolução</Text><Text style={styles.value}>{normalizarTexto(params.dataDevolucao || '-')}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Termo</Text>
          <Text style={styles.paragraph}>{cleanText}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tabela de equipamentos</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}><Text style={styles.colDesc}>Descrição</Text><Text style={styles.colType}>Tipo</Text><Text style={styles.colTag}>Etiqueta</Text></View>
            {items.map((item, index) => (
              <View key={`${item.etiqueta}-${index}`} style={styles.tableRow}>
                <Text style={styles.colDesc}>{normalizarTexto(item.descricao)}</Text>
                <Text style={styles.colType}>{normalizarTexto(item.tipo)}</Text>
                <Text style={styles.colTag}>{normalizarTexto(item.etiqueta)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assinatura eletrônica</Text>
          <View style={styles.signatureBox}>
            <Text>Assinado por: {normalizarTexto(params.assinaturaTexto || '-')}</Text>
            <Text>Data/hora (UTC): {signedAt.toISOString()}</Text>
            <Text>IP: {normalizarTexto(params.assinadorIp || '-')}</Text>
            {params.assinaturaImagemDataUrl ? <Image src={params.assinaturaImagemDataUrl} style={styles.signatureImage} /> : null}
          </View>
          {params.observacoes ? <Text style={{ marginTop: 6 }}>Observações: {normalizarTexto(params.observacoes)}</Text> : null}
        </View>

        <Text style={styles.footer} fixed>
          Documento para auditoria • ID: {params.termoId} • Hash SHA-256: {payloadHash.slice(0, 32)}... • Gerado em {new Date().toISOString()}
        </Text>
      </Page>
    </Document>
  )

  return Buffer.from(await renderToBuffer(doc))
}
