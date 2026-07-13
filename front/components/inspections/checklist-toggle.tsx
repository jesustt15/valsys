'use client'

import { Badge } from '@/components/ui/badge'

interface Props {
  label: string
  variant: 'success' | 'destructive' | 'warning'
  pending: boolean
}

export function ChecklistToggle({ label, variant, pending }: Props) {
  return (
    <Badge variant={variant} className="transition-all duration-200 hover:ring-2 hover:ring-ring pointer-events-none">
      {pending ? '...' : label}
    </Badge>
  )
}
