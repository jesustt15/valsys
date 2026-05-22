import * as React from 'react'
import { cn } from '@/lib/utils'

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  placeholder?: string
  className?: string
}

const SelectContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  placeholder?: string
}>({ value: undefined, onValueChange: undefined, open: false, setOpen: () => {}, placeholder: 'Seleccionar...' })

function Select({ value, onValueChange, children, placeholder = 'Seleccionar...', className = '' }: SelectProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, placeholder }}>
      <div className={cn('relative', className)}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

function SelectTrigger({ className = '', children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen, value, placeholder } = React.useContext(SelectContext)

  return (
    <button
      type="button"
      role="combobox"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={cn(
        'flex h-11 w-full items-center justify-between rounded-xl border border-input bg-background px-4 py-3 text-sm',
        'transition-all duration-200',
        'hover:border-primary/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        !value && 'text-muted-foreground',
        className
      )}
      {...props}
    >
      {children || <span>{value || placeholder}</span>}
      <svg
        className={cn('h-4 w-4 shrink-0 opacity-50 transition-transform duration-200', open && 'rotate-180')}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
      </svg>
    </button>
  )
}

function SelectValue({ placeholder = 'Seleccionar...' }: { placeholder?: string }) {
  const { value } = React.useContext(SelectContext)
  if (!value) return <span className="text-muted-foreground">{placeholder}</span>
  return <span>{value}</span>
}

function SelectContent({ className = '', children }: { className?: string; children: React.ReactNode }) {
  const { open } = React.useContext(SelectContext)
  if (!open) return null

  return (
    <div
      className={cn(
        'absolute z-50 mt-2 w-full min-w-[8rem] overflow-hidden rounded-xl border border-border bg-popover shadow-lg',
        'animate-in fade-in-0 zoom-in-95',
        className
      )}
    >
      <div className="p-1">{children}</div>
    </div>
  )
}

function SelectItem({ className = '', value, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const { value: selectedValue, onValueChange, setOpen } = React.useContext(SelectContext)
  const isSelected = selectedValue === value

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      onClick={() => {
        onValueChange?.(value)
        setOpen(false)
      }}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-sm outline-none',
        'transition-colors duration-150',
        'hover:bg-secondary',
        isSelected && 'bg-secondary font-medium',
        className
      )}
      {...props}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
      <span className={cn(isSelected && 'pl-5')}>{children}</span>
    </button>
  )
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
