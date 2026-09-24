'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Search, BadgeCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { DeleteInspectionButton } from '@/components/inspections/delete-inspection-button'

interface CertifiedInspection {
  id: string
  inspectionDate: Date | null
  licensePlate: string | null
  brand: string | null
  model: string | null
  status: string
  correlativeNumber: string | null
  ownerName?: string | null
  fullName?: string | null
  type: 'GNC' | 'UTP'
  createdAt?: Date | string | null
}

interface CertifiedTableProps {
  inspections: CertifiedInspection[]
  canDelete?: boolean
}

export function CertifiedTable({ inspections, canDelete = false }: CertifiedTableProps) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'GNC' | 'UTP'>('all')

  const typeCounts = useMemo(() => {
    const counts = { all: inspections.length, GNC: 0, UTP: 0 }
    for (const insp of inspections) {
      counts[insp.type]++
    }
    return counts
  }, [inspections])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return inspections.filter((i) => {
      const matchesQuery =
        !q ||
        (i.licensePlate ?? '').toLowerCase().includes(q) ||
        (i.correlativeNumber ?? '').toLowerCase().includes(q) ||
        (i.ownerName ?? i.fullName ?? '').toLowerCase().includes(q)

      const matchesType = typeFilter === 'all' || i.type === typeFilter

      return matchesQuery && matchesType
    })
  }, [inspections, query, typeFilter])

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '—'
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Type Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Filtrar por tipo">
          {[
            { value: 'all' as const, label: 'Todas' },
            { value: 'GNC' as const, label: 'GNC' },
            { value: 'UTP' as const, label: 'UTP' },
          ].map((tab) => {
            const isActive = typeFilter === tab.value
            const count = typeCounts[tab.value]
            return (
              <button
                key={tab.value}
                onClick={() => setTypeFilter(tab.value)}
                className={`
                  relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap
                  transition-colors focus:outline-none
                  ${isActive
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:border-b-2 hover:border-muted-foreground/20'
                  }
                `}
              >
                {tab.label}
                <span className={`
                  inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium
                  ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}
                `}>
                  {count}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          id="certified-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por cliente, placa o correlativo..."
          className="pl-9 h-12"
        />
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Mostrando <span className="font-semibold text-foreground">{filtered.length}</span>{' '}
        {filtered.length === 1 ? 'inspección certificada' : 'inspecciones certificadas'}
      </div>

      {/* Table/List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
          <BadgeCheck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No se encontraron inspecciones certificadas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inspection) => {
            const href = inspection.type === 'GNC' 
              ? `/inspections/${inspection.id}` 
              : `/utp/${inspection.id}`
            const ownerName = inspection.ownerName ?? inspection.fullName ?? 'Sin propietario'

            return (
              <div
                key={inspection.id}
                className="group relative p-4 bg-background border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Link href={href} className="block">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`
                          inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase
                          ${inspection.type === 'GNC' 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-status-info/10 text-status-info'}
                        `}>
                          <BadgeCheck className="w-3 h-3" />
                          {inspection.type}
                        </span>
                        {inspection.correlativeNumber && (
                          <span className="text-xs font-mono text-muted-foreground">
                            #{inspection.correlativeNumber}
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-2">
                        <h3 className="text-base font-semibold text-foreground">
                          {inspection.licensePlate ?? 'Sin placa'}
                        </h3>
                        {(inspection.brand || inspection.model) && (
                          <span className="text-sm text-muted-foreground">
                            {[inspection.brand, inspection.model].filter(Boolean).join(' ')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span>{ownerName}</span>
                        <span>•</span>
                        <span>{formatDate(inspection.inspectionDate ?? inspection.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </Link>

                {canDelete && (
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DeleteInspectionButton 
                      inspectionId={inspection.id} 
                      source={inspection.type === 'GNC' ? 'gnc' : 'utp'}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
