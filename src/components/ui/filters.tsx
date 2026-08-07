'use client'

import { ChangeEvent, ReactNode } from 'react'
import { Input, Select } from './index'

export type FilterOption = {
  value: string
  label: string
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col sm:flex-row flex-wrap gap-3">{children}</div>
}

export function TextFilter({
  label = 'Busca',
  value,
  onChange,
  placeholder,
  type = 'text',
  className = '',
}: {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'date'
  className?: string
}) {
  return (
    <div className={className}>
      <Input label={label} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  )
}

export function SelectFilter({
  label,
  value,
  onChange,
  options,
  allLabel,
  className = '',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: FilterOption[]
  allLabel: string
  className?: string
}) {
  return (
    <div className={className}>
      <Select label={label} value={value} onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
    </div>
  )
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: {
  startDate: string
  endDate: string
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
}) {
  return (
    <>
      <TextFilter label="Data inicial" type="date" value={startDate} onChange={onStartDateChange} className="min-w-40" />
      <TextFilter label="Data final" type="date" value={endDate} onChange={onEndDateChange} className="min-w-40" />
    </>
  )
}
