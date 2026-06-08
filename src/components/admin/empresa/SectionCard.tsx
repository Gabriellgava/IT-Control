"use client";

// ============================================================
// SectionCard.tsx — Card de seção do formulário
// ============================================================

import React from "react";
import { LucideIcon } from "lucide-react";

interface SectionCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  iconColor?: string;
  children: React.ReactNode;
}

export function SectionCard({
  title,
  description,
  icon: Icon,
  iconColor = "text-blue-600",
  children,
}: SectionCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200/80 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* ── Header do card ──────────────────────────────── */}
      <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 flex items-center justify-center flex-shrink-0 ${iconColor}`}
        >
          <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-white">{title}</h2>
          {description && (
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{description}</p>
          )}
        </div>
      </div>

      {/* ── Conteúdo ────────────────────────────────────── */}
      <div className="p-6">{children}</div>
    </div>
  );
}
