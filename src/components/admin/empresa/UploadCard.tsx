"use client";

// ============================================================
// UploadCard.tsx — Componente de Upload com Drag & Drop
// ============================================================

import React, { useCallback, useRef, useState } from "react";
import { Upload, X, ImageIcon, AlertCircle, CheckCircle2 } from "lucide-react";
import { FileUploadState } from "../../../app/admin/empresas/types";

interface UploadCardProps {
  title: string;
  description: string;
  accept: string;
  acceptLabel: string;
  maxSizeMB?: number;
  hint?: string;
  currentUrl?: string | null;
  onFileChange: (file: File | null, preview: string | null) => void;
}

export function UploadCard({
  title,
  description,
  accept,
  acceptLabel,
  maxSizeMB = 5,
  hint,
  currentUrl,
  onFileChange,
}: UploadCardProps) {
  const [state, setState] = useState<FileUploadState>({
    file: null,
    preview: currentUrl || null,
    uploading: false,
    error: null,
  });
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Valida e processa o arquivo ──────────────────────────
  const processFile = useCallback(
    (file: File) => {
      // Validação de tamanho
      if (file.size > maxSizeMB * 1024 * 1024) {
        setState((prev: FileUploadState) => ({
          ...prev,
          error: `Arquivo muito grande. Máximo: ${maxSizeMB}MB`,
        }));
        return;
      }

      // Gera preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        setState({ file, preview, uploading: false, error: null });
        onFileChange(file, preview);
      };
      reader.readAsDataURL(file);
    },
    [maxSizeMB, onFileChange]
  );

  // ── Handlers de Drag & Drop ──────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  // ── Handler de input manual ──────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // ── Remove o arquivo ─────────────────────────────────────
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setState({ file: null, preview: null, uploading: false, error: null });
    onFileChange(null, null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>

      {/* ── Área de Drop ──────────────────────────────────── */}
      <div
        onClick={() => !state.preview && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative rounded-xl border-2 border-dashed transition-all duration-200
          ${state.preview ? "border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700/50" : "cursor-pointer"}
          ${isDragOver
            ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30 scale-[1.01]"
            : state.preview
            ? "border-slate-200 dark:border-gray-600"
            : "border-slate-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-900/20"
          }
          ${state.error ? "border-red-300 dark:border-red-700 bg-red-50/40 dark:bg-red-900/20" : ""}
        `}
      >
        {state.preview ? (
          /* ── Preview da Imagem ──────────────────────────── */
          <div className="relative p-4 flex items-center gap-4">
            {/* Miniatura */}
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 shadow-sm flex-shrink-0 flex items-center justify-center">
              <img
                src={state.preview}
                alt="Preview"
                className="w-full h-full object-contain"
              />
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 mb-1">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Arquivo carregado</span>
              </div>
              {state.file && (
                <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                  {state.file.name}
                </p>
              )}
              {state.file && (
                <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                  {(state.file.size / 1024).toFixed(1)} KB
                </p>
              )}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-2 text-xs text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 font-medium"
              >
                Trocar arquivo
              </button>
            </div>
            {/* Botão de remover */}
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
          /* ── Estado vazio / Drop ────────────────────────── */
          <div className="py-8 px-6 flex flex-col items-center text-center gap-3">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isDragOver
                  ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400"
                  : "bg-slate-100 dark:bg-gray-700 text-slate-400 dark:text-gray-500"
              }`}
            >
              {isDragOver ? (
                <ImageIcon className="w-6 h-6" />
              ) : (
                <Upload className="w-6 h-6" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-gray-300">
                {isDragOver ? "Solte o arquivo aqui" : "Arraste e solte ou clique para selecionar"}
              </p>
              <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                {acceptLabel} · Máx. {maxSizeMB}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Erro de upload ────────────────────────────────── */}
      {state.error && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      {/* ── Dica contextual ──────────────────────────────── */}
      {hint && !state.error && (
        <p className="text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          💡 {hint}
        </p>
      )}

      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}
