import * as React from 'react'
import { createPortal } from 'react-dom'
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
  triggerRef: React.RefObject<HTMLButtonElement | null>
}>({ value: undefined, onValueChange: undefined, open: false, setOpen: () => {}, placeholder: 'Seleccionar...', triggerRef: { current: null } })

function Select({ value, onValueChange, children, placeholder = 'Seleccionar...', className = '' }: SelectProps) {
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, placeholder, triggerRef }}>
      <div className={cn('relative', className)}>
        {children}
      </div>
    </SelectContext.Provider>
  )
}

function SelectTrigger({ className = '', children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen, value, placeholder, triggerRef } = React.useContext(SelectContext)

  return (
    <button
      ref={triggerRef}
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

const GAP = 8

// useLayoutEffect warns during SSR; fall back to useEffect on the server
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

function SelectContent({ className = '', children }: { className?: string; children: React.ReactNode }) {
  const { open, setOpen, triggerRef } = React.useContext(SelectContext)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [coords, setCoords] = React.useState<{
    left: number
    width: number
    top?: number
    bottom?: number
  } | null>(null)

  /**
   * Position is computed in viewport coordinates because the dropdown uses
   * `position: fixed`. getBoundingClientRect() already returns viewport-relative
   * values, so window.scrollY/scrollX must NOT be added — doing so pushes the
   * panel far off-screen on a scrolled page.
   */
  const updatePosition = React.useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const contentHeight = contentRef.current?.offsetHeight ?? 0
    const spaceBelow = window.innerHeight - rect.bottom - GAP
    const spaceAbove = rect.top - GAP
    // Flip upward only when it does not fit below and there is more room above
    const openUp = contentHeight > spaceBelow && spaceAbove > spaceBelow

    setCoords(
      openUp
        ? {
            left: rect.left,
            width: rect.width,
            bottom: window.innerHeight - rect.top + GAP,
          }
        : { left: rect.left, width: rect.width, top: rect.bottom + GAP }
    )
  }, [triggerRef])

  useIsomorphicLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }
    updatePosition()
  }, [open, updatePosition])

  // Follow the trigger on scroll / resize instead of closing: on mobile the
  // browser may scroll to focus the trigger right after it opens, and closing
  // there would make the panel appear to never show. Only close once the
  // trigger has actually left the viewport.
  React.useEffect(() => {
    if (!open) return
    const handleMove = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false)
        return
      }
      updatePosition()
    }
    window.addEventListener('scroll', handleMove, true)
    window.addEventListener('resize', handleMove)
    return () => {
      window.removeEventListener('scroll', handleMove, true)
      window.removeEventListener('resize', handleMove)
    }
  }, [open, setOpen, triggerRef, updatePosition])

  // Close on click/tap outside
  React.useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: PointerEvent) => {
      const target = event.target as Node
      if (contentRef.current?.contains(target)) return
      if (triggerRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', handleClickOutside)
    return () => document.removeEventListener('pointerdown', handleClickOutside)
  }, [open, setOpen, triggerRef])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={contentRef}
      className={cn(
        'fixed z-[100] min-w-[8rem] overflow-hidden rounded-xl border border-border bg-popover shadow-lg',
        'animate-in fade-in-0 zoom-in-95',
        className
      )}
      style={
        coords
          ? {
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              ...(coords.top !== undefined ? { top: `${coords.top}px` } : {}),
              ...(coords.bottom !== undefined ? { bottom: `${coords.bottom}px` } : {}),
            }
          : undefined
      }
    >
      <div className="p-1 max-h-[min(20rem,calc(100dvh_-_4rem))] overflow-y-auto">{children}</div>
    </div>,
    document.body
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
