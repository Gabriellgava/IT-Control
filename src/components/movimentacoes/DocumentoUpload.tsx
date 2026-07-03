"use client"

import { useCallback, useRef, useState } from "react"
import { Upload, X, AlertCircle, CheckCircle2, FileText } from "lucide-react"

interface DocumentoUploadState {
  file: File | null
  preview: string | null
  error: string | null
}

interface DocumentoUploadProps {
  titulo?: string
  descricao?: string
  aceitarTipos?: string
  maxSizeMB?: number
  onFileChange: (file: File | null) => void
}

export function DocumentoUpload({
  titulo = "Nota Fiscal",
  descricao = "Upload da nota fiscal da entrada",
  aceitarTipos = ".pdf,.png,.jpg,.jpeg",
  maxSizeMB = 10,
  onFileChange,
}: DocumentoUploadProps) {
  const [state, setState] = useState<DocumentoUploadState>({
    file: null,
    preview: null,
    error: null,
  })
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(
    (file: File) => {
      // Validação de tamanho
      if (file.size > maxSizeMB * 1024 * 1024) {
        setState((prev) => ({
          ...prev,
          error: `Arquivo muito grande. Máximo: ${maxSizeMB}MB`,
        }))
        return
      }

      // Validação de tipo
      const tipos = aceitarTipos.split(",").map(t => t.trim())
      const extensao = "." + file.name.split(".").pop()?.toLowerCase()
      if (!tipos.includes(extensao)) {
        setState((prev) => ({
          ...prev,
          error: `Tipo de arquivo não permitido. Aceita: ${aceitarTipos}`,
        }))
        return
      }

      setState({ file, preview: file.name, error: null })
      onFileChange(file)
    },
    [maxSizeMB, aceitarTipos, onFileChange]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setState({ file: null, preview: null, error: null })
    onFileChange(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{titulo}</h3>
        <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{descricao}</p>
      </div>

      <div
        onClick={() => !state.preview && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative rounded-xl border-2 border-dashed transition-all duration-200
          ${state.preview ? "border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700/50" : "cursor-pointer"}
          ${
            isDragOver
              ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 scale-[1.01]"
              : state.preview
                ? "border-slate-200 dark:border-gray-600"
                : "border-slate-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-900/20"
          }
          ${state.error ? "border-red-300 dark:border-red-700 bg-red-50/40 dark:bg-red-900/20" : ""}
        `}
      >
        {state.preview ? (
          <div className="relative p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 shadow-sm flex-shrink-0 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-500 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Arquivo selecionado</span>
              </div>
              {state.file && (
                <>
                  <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{state.file.name}</p>
                  <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                    {(state.file.size / 1024).toFixed(1)} KB
                  </p>
                </>
              )}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-2 text-xs text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 font-medium"
              >
                Alterar arquivo
              </button>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 shadow-sm flex items-center justify-center text-slate-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-700 transition-colors"
              title="Remover"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="py-8 px-6 flex flex-col items-center text-center gap-3">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isDragOver
                  ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                  : "bg-slate-100 dark:bg-gray-700 text-slate-400 dark:text-gray-500"
              }`}
            >
              {isDragOver ? (
                <FileText className="w-6 h-6" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-gray-300">
                {isDragOver ? "Solte o arquivo aqui" : "Arraste e solte ou clique para selecionar"}
              </p>
              <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                Formatos: {aceitarTipos} • Máx. {maxSizeMB}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {state.error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={aceitarTipos}
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  )
}
