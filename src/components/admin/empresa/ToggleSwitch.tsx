"use client";

// ============================================================
// ToggleSwitch.tsx — Switch de configuração booleana
// ============================================================

interface ToggleSwitchProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function ToggleSwitch({
  id,
  label,
  description,
  checked,
  onChange,
}: ToggleSwitchProps) {
  return (
    <div className="flex items-start gap-3 py-3.5 px-4 rounded-xl bg-slate-50 dark:bg-gray-700/50 border border-slate-100 dark:border-gray-600 hover:bg-slate-100/60 dark:hover:bg-gray-700 transition-colors">
      {/* Texto */}
      <div className="flex-1">
        <label
          htmlFor={id}
          className="text-sm font-medium text-slate-700 dark:text-gray-300 cursor-pointer select-none"
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">{description}</p>
        )}
      </div>

      {/* Switch visual */}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative flex-shrink-0 mt-0.5 w-10 h-5.5 h-[22px] rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800
          ${checked ? "bg-blue-600" : "bg-slate-300 dark:bg-gray-600"}
        `}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200
            ${checked ? "translate-x-[18px]" : "translate-x-0"}
          `}
        />
      </button>
    </div>
  );
}
