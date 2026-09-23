'use client'

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  id: string
  title: string
  icon?: React.ReactNode
  isOpen: boolean
  onToggle: (id: string) => void
  indicator?: React.ReactNode
  children: React.ReactNode
}

/**
 * Controllable accordion section with CSS grid-rows animation (0fr → 1fr).
 * Desktop: always open (content has `md:block`).
 * Mobile: toggleable via onToggle callback, animate collapse/expand.
 *
 * ARIA: button header with aria-expanded/aria-controls for a11y.
 */
export function CollapsibleSection({
  id,
  title,
  icon,
  isOpen,
  onToggle,
  indicator,
  children,
}: CollapsibleSectionProps) {
  const contentId = `collapsible-content-${id}`
  const headerId = `collapsible-header-${id}`

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header — always visible, clickable to toggle */}
      <button
        type="button"
        id={headerId}
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => onToggle(id)}
        className="flex items-center justify-between w-full px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="font-semibold text-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {indicator}
          <ChevronDown
            className={cn(
              'w-5 h-5 text-muted-foreground transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Content — CSS grid-rows animation (0fr → 1fr) */}
      <div
        id={contentId}
        role="region"
        aria-labelledby={headerId}
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          {/* Desktop: always visible regardless of open state */}
          <div className={cn('md:block', isOpen ? 'block' : 'hidden')}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
