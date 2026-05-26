'use client'

import SignatureCanvas from 'react-signature-canvas'
import { useRef, useState } from 'react'
import { Button, Input } from '@/components/ui'
import { fetchJsonOrThrow } from '@/lib/http/fetch-json'

export function SignatureForm({ token }: { token: string }) {
  const ref = useRef<SignatureCanvas | null>(null)
  const [mode, setMode] = useState<'drawn' | 'typed'>('drawn')
  const [typedName, setTypedName] = useState('')
  const [saving, setSaving] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async () => {
    setSaving(true)
    setMessage('')
    const payload = mode === 'drawn'
      ? { signatureType: 'drawn', signatureDataUrl: ref.current?.toDataURL('image/png'), acceptedTerms }
      : { signatureType: 'typed', typedName, acceptedTerms }

    try {
      await fetchJsonOrThrow<{ ok: boolean }>(`/api/assinatura/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        context: 'signature-form-submit',
      })
      setMessage('Assinado com sucesso.')
    } catch (error) {
      console.error('[signature-form] erro ao assinar termo', { token, mode, error })
      setMessage(error instanceof Error ? error.message : 'Erro ao assinar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={mode === 'drawn' ? 'primary' : 'secondary'} onClick={() => setMode('drawn')}>Desenhar</Button>
        <Button variant={mode === 'typed' ? 'primary' : 'secondary'} onClick={() => setMode('typed')}>Digitar nome</Button>
      </div>

      {mode === 'drawn' ? (
        <div className="border rounded-lg p-2 bg-white">
          <SignatureCanvas ref={ref} canvasProps={{ className: 'w-full h-44' }} />
          <Button variant="secondary" onClick={() => ref.current?.clear()}>Limpar</Button>
        </div>
      ) : (
        <Input label="Nome completo" value={typedName} onChange={(e) => setTypedName(e.target.value)} />
      )}

      <label className='flex items-center gap-2 text-sm'><input type='checkbox' checked={acceptedTerms} onChange={(e)=>setAcceptedTerms(e.target.checked)} /> Declaro que li e aceito o termo.</label>
      <Button onClick={submit} disabled={saving || !acceptedTerms || (mode === 'typed' && !typedName.trim())}>Confirmar assinatura</Button>
      {message && <p className="text-sm">{message}</p>}
    </div>
  )
}
