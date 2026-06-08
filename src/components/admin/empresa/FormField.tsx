"use client";

// ============================================================
// FormField.tsx — Campo de formulário reutilizável
// ============================================================

import React from "react";
import { FieldError } from "react-hook-form";

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: FieldError;
  optional?: boolean;
  children: React.ReactNode;
  hint?: string;
}

export function FormField({
  label,
  required,
  error,
  optional,
  children,
  hint,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      {/* Label */}
      <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-gray-300">
        {label}
        {required && (
          <span className="text-red-500 text-xs" title="Obrigatório">
            *
          </span>
        )}
        {optional && (
          <span className="text-slate-400 dark:text-gray-500 text-xs font-normal">(opcional)</span>
        )}
      </label>

      {/* Input slot */}
      {children}

      {/* Hint */}
      {hint && !error && (
        <p className="text-xs text-slate-400 dark:text-gray-500">{hint}</p>
      )}

      {/* Erro de validação */}
      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-red-500 mt-px" />
          {error.message}
        </p>
      )}
    </div>
  );
}

// ── Estilo base do input ─────────────────────────────────────
export const inputClass = (hasError?: boolean) =>
  [
    "w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-800 dark:text-white",
    "bg-white dark:bg-gray-700 placeholder:text-slate-400 dark:placeholder:text-gray-500",
    "transition-all duration-150 outline-none",
    "focus:ring-2 focus:ring-offset-0",
    hasError
      ? "border-red-300 dark:border-red-700 focus:border-red-400 dark:focus:border-red-600 focus:ring-red-100 dark:focus:ring-red-900/30"
      : "border-slate-200 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-blue-100 dark:focus:ring-blue-900/30 hover:border-slate-300 dark:hover:border-gray-500",
  ].join(" ");
