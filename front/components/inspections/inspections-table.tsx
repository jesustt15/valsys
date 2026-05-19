'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface InspectionsTableProps {
  inspections: Array<{
    id: string
    inspectionDate: Date | null
    licensePlate: string | null
    brand: string | null
    model: string | null
    status: string
    kmCurrent: number
    operatorName: string | null
  }>
}

const STATUS_LABELS: Record<string, string> = {
  inspeccion_inicial: 'Inspección Inicial',
  en_planta: 'En Planta',
  finalizado: 'Finalizado',
}

const STATUS_BADGE: Record<string, 'info' | 'warning' | 'success'> = {
  inspeccion_inicial: 'info',
  en_planta: 'warning',
  finalizado: 'success',
}

export function InspectionsTable({ inspections }: InspectionsTableProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return inspections.filter((i) => {
      const matchesQuery =
        !q || (i.licensePlate ?? '').toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === 'all' || i.status === statusFilter

      return matchesQuery && matchesStatus
    })
  }, [inspections, query, statusFilter])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="inspections-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por patente..."
            className="pl-9 h-11"
          />
        </div>

        <select
          id="inspections-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
        >
          <option value="all">Todos los estados</option>
          <option value="inspeccion_inicial">Inspección Inicial</option>
          <option value="en_planta">En Planta</option>
          <option value="finalizado">Finalizado</option>
        </select>

        <Button asChild className="h-11">
          <Link href="/inspections/new">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Inspección
          </Link>
        </Button>
      </div>

      {/* Results count */}
      {query || statusFilter !== 'all' ? (
        <p className="text-xs text-muted-foreground">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} de {inspections.length}
        </p>
      ) : null}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Fecha
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Patente
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  Vehículo
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Estado
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  Km
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  Operador
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((insp, i) => (
                <motion.tr
                  key={insp.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">
                    {insp.inspectionDate
                      ? new Date(insp.inspectionDate).toLocaleDateString('es-AR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-sm font-medium text-foreground font-mono">
                    {insp.licensePlate ?? '—'}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground hidden sm:table-cell">
                    {insp.brand && insp.model
                      ? `${insp.brand} ${insp.model}`
                      : insp.brand || insp.model || '—'}
                  </td>
                  <td className="px-4 py-3.5 text-sm">
                    <Badge variant={STATUS_BADGE[insp.status] ?? 'info'}>
                      {STATUS_LABELS[insp.status] ?? insp.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground hidden sm:table-cell">
                    {insp.kmCurrent.toLocaleString('es-AR')}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground hidden sm:table-cell">
                    {insp.operatorName ?? '—'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {query || statusFilter !== 'all'
              ? 'No se encontraron inspecciones con ese criterio'
              : inspections.length === 0
                ? 'No hay inspecciones registradas. Cree la primera para comenzar.'
                : 'No hay inspecciones registradas'}
          </div>
        )}
      </Card>
    </motion.div>
  )
}
