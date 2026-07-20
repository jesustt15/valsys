'use client'

import { useMemo, useState, useCallback } from 'react'

interface MonthYearPickerProps {
  /** Current value in "YYYY-MM-01" format. When provided, the component is controlled. */
  value?: string
  /** Called with the new "YYYY-MM-01" value when month or year changes. */
  onChange: (value: string) => void
  disabled?: boolean
  id?: string
  /** Pass a name to include a hidden form input (for Server Action forms). */
  name?: string
  required?: boolean
}

const MONTHS = [
  { value: '01', label: '01 - Enero' },
  { value: '02', label: '02 - Febrero' },
  { value: '03', label: '03 - Marzo' },
  { value: '04', label: '04 - Abril' },
  { value: '05', label: '05 - Mayo' },
  { value: '06', label: '06 - Junio' },
  { value: '07', label: '07 - Julio' },
  { value: '08', label: '08 - Agosto' },
  { value: '09', label: '09 - Septiembre' },
  { value: '10', label: '10 - Octubre' },
  { value: '11', label: '11 - Noviembre' },
  { value: '12', label: '12 - Diciembre' },
]

const START_YEAR = 2007

function parseDateString(value: string | undefined): { month: string; year: string } {
  if (!value) return { month: '', year: '' }
  const match = value.match(/^(\d{4})-(\d{2})/)
  if (match) {
    return { year: match[1], month: match[2] }
  }
  return { month: '', year: '' }
}

function buildDateValue(year: string, month: string): string {
  return `${year}-${month}-01`
}

export function MonthYearPicker({
  value: valueProp,
  onChange,
  disabled,
  id,
  name,
  required,
}: MonthYearPickerProps) {
  const currentYear = new Date().getFullYear()

  const years = useMemo(() => {
    const result: { value: string; label: string }[] = []
    for (let y = currentYear; y >= START_YEAR; y--) {
      result.push({ value: String(y), label: String(y) })
    }
    return result
  }, [currentYear])

  // Determine if controlled (value prop explicitly passed)
  const isControlled = valueProp !== undefined

  // Uncontrolled internal state — only used when valueProp is undefined
  const parsedFromProp = useMemo(() => parseDateString(valueProp), [valueProp])
  const [internalMonth, setInternalMonth] = useState(parsedFromProp.month)
  const [internalYear, setInternalYear] = useState(parsedFromProp.year)

  // Sync internal state when switching from uncontrolled to controlled
  const month = isControlled ? parsedFromProp.month : internalMonth
  const year = isControlled ? parsedFromProp.year : internalYear

  const handleMonthChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const m = e.target.value
      const y = year || String(currentYear)
      const newValue = buildDateValue(y, m)
      if (!isControlled) {
        setInternalMonth(m)
        if (!year) setInternalYear(String(currentYear))
      }
      onChange(newValue)
    },
    [year, currentYear, isControlled, onChange],
  )

  const handleYearChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const y = e.target.value
      const m = month || '01'
      const newValue = buildDateValue(y, m)
      if (!isControlled) {
        setInternalYear(y)
        if (!month) setInternalMonth('01')
      }
      onChange(newValue)
    },
    [month, isControlled, onChange],
  )

  const selectClass =
    'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

  // The value submitted through the hidden input — controlled or internal
  const submitValue = isControlled ? valueProp : (month && year ? buildDateValue(year, month) : '')

  return (
    <div className="flex gap-2">
      <select
        id={id ? `${id}-month` : undefined}
        value={month}
        onChange={handleMonthChange}
        disabled={disabled}
        required={required}
        className={selectClass}
      >
        <option value="">Mes</option>
        {MONTHS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      <select
        id={id ? `${id}-year` : undefined}
        value={year}
        onChange={handleYearChange}
        disabled={disabled}
        required={required}
        className={selectClass}
      >
        <option value="">Año</option>
        {years.map((y) => (
          <option key={y.value} value={y.value}>
            {y.label}
          </option>
        ))}
      </select>

      {name && <input type="hidden" name={name} value={submitValue} />}
    </div>
  )
}
