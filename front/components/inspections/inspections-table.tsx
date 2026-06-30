'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, Search, FileText, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { PendingItems } from '@/lib/services/inspection-pending'

interface InspectionsTableProps {
  inspections: Array<{
    id: string
    inspectionDate: Date | null
    licensePlate: string | null
    brand: string | null
    model: string | null
    status: string
    kmCurrent: number | null
    operatorName: string | null
    correlativeNumber: string | null
  }>
  pendingSummaries?: Record<string, PendingItems>
}

const STATUS_LABELS: Record<string, string> = {
  inspeccion_inicial: 'Inspección Inicial',
  recalificacion: 'Recalificación',
  por_programar: 'Por Programar',
  certificado: 'Certificado',
}

const STATUS_BADGE: Record<string, 'info' | 'warning' | 'success' | 'destructive'> = {
  inspeccion_inicial: 'info',
  recalificacion: 'warning',
  por_programar: 'destructive',
  certificado: 'success',
}

const STATUS_TABS = [
  { value: 'all', label: 'Todas' },
  { value: 'inspeccion_inicial', label: 'Inicial' },
  { value: 'recalificacion', label: 'Recalificación' },
  { value: 'por_programar', label: 'Por Programar' },
  { value: 'certificado', label: 'Certificadas' },
] as const

export function InspectionsTable({ inspections, pendingSummaries = {} }: InspectionsTableProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [pendingFilter, setPendingFilter] = useState<string>('all')
  const [operatorFilter, setOperatorFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'createdAt' | 'inspectionDate'>('createdAt')

  // Extract unique operator names for the filter
  const operators = useMemo(() => {
    const names = new Set(inspections.map((i) => i.operatorName).filter(Boolean))
    return Array.from(names).sort()
  }, [inspections])

  // Count inspections by status for tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: inspections.length }
    for (const insp of inspections) {
      counts[insp.status] = (counts[insp.status] ?? 0) + 1
    }
    return counts
  }, [inspections])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    const result = inspections.filter((i) => {
      const matchesQuery =
        !q ||
        (i.licensePlate ?? '').toLowerCase().includes(q) ||
        (i.correlativeNumber ?? '').toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === 'all' || i.status === statusFilter

      const pending = pendingSummaries[i.id]
      const matchesPending =
        pendingFilter === 'all' ||
        (pendingFilter === 'blocking' && (pending?.totalBlocking ?? 0) > 0) ||
        (pendingFilter === 'warnings' && (pending?.totalBlocking ?? 0) === 0 && (pending?.totalWarnings ?? 0) > 0) ||
        (pendingFilter === 'clean' && (pending?.totalBlocking ?? 0) === 0 && (pending?.totalWarnings ?? 0) === 0)

      const matchesOperator =
        operatorFilter === 'all' || i.operatorName === operatorFilter

      return matchesQuery && matchesStatus && matchesPending && matchesOperator
    })

    return result.sort((a, b) => {
      if (sortBy === 'inspectionDate') {
        return (b.inspectionDate?.getTime() ?? 0) - (a.inspectionDate?.getTime() ?? 0)
      }
      // createdAt — las más recientes primero; inspectionDate como fallback
      return (b.inspectionDate?.getTime() ?? 0) - (a.inspectionDate?.getTime() ?? 0)
    })
  }, [inspections, query, statusFilter, pendingFilter, operatorFilter, pendingSummaries, sortBy])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Status Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Filtrar por estado">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.value
            const count = statusCounts[tab.value] ?? 0
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
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

      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="inspections-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por placa o correlativo..."
            className="pl-9 h-11"
          />
        </div>

        <select
          id="inspections-pending-filter"
          value={pendingFilter}
          onChange={(e) => setPendingFilter(e.target.value)}
          className="flex h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
        >
          <option value="all">Pendientes</option>
          <option value="blocking">Con bloqueos</option>
          <option value="warnings">Con advertencias</option>
          <option value="clean">Sin novedad</option>
        </select>

        <select
          id="inspections-operator-filter"
          value={operatorFilter}
          onChange={(e) => setOperatorFilter(e.target.value)}
          className="flex h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
        >
          <option value="all">Operador</option>
          {operators.map((name) => (
            <option key={name} value={name!}>{name}</option>
          ))}
        </select>

        <select
          id="inspections-sort-filter"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'createdAt' | 'inspectionDate')}
          className="flex h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
        >
          <option value="createdAt">Recientes</option>
          <option value="inspectionDate">Por fecha</option>
        </select>

        <Link
          href="/inspections/new"
          className="inline-flex items-center justify-center gap-2 h-11 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Nueva
        </Link>
      </div>

      {/* Results count */}
      {query || pendingFilter !== 'all' || operatorFilter !== 'all' ? (
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
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                  Correlativo
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  Vehículo
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Estado
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                  Pendientes
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  Operador
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Acciones
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
                  <td className="px-4 py-3.5 text-sm font-mono text-muted-foreground hidden md:table-cell">
                    {insp.correlativeNumber ?? '—'}
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
                  <td className="px-4 py-3.5 text-sm hidden md:table-cell">
                    <PendingBadge pending={pendingSummaries[insp.id]} status={insp.status} />
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground hidden sm:table-cell">
                    {insp.operatorName ?? '—'}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/inspections/${insp.id}`}
                      title="Ver Expediente"
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-secondary hover:text-secondary-foreground transition-all"
                    >
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="sr-only">Ver Expediente</span>
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {query || pendingFilter !== 'all' || operatorFilter !== 'all'
              ? 'No se encontraron inspecciones con esos filtros'
              : inspections.length === 0
                ? 'No hay inspecciones registradas. Cree la primera para comenzar.'
                : 'No hay inspecciones en esta categoría'}
          </div>
        )}
      </Card>
    </motion.div>
  )
}

// ─── Pending Badge Component ────────────────────────────────────

function PendingBadge({
  pending,
  status,
}: {
  pending?: PendingItems
  status: string
}) {
  if (!pending) return <span className="text-xs text-muted-foreground">—</span>

  // Certificado con todo ok
  if (status === 'certificado' && pending.totalPending === 0 && pending.hasCertificate) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Completo
      </span>
    )
  }

  // Blocking issues
  if (pending.totalBlocking > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium" title={getPendingTitle(pending)}>
        <AlertCircle className="w-3.5 h-3.5" />
        {pending.totalBlocking} bloqueo{pending.totalBlocking > 1 ? 's' : ''}
      </span>
    )
  }

  // Warnings
  if (pending.totalWarnings > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400" title={getPendingTitle(pending)}>
        <AlertTriangle className="w-3.5 h-3.5" />
        {pending.totalWarnings} pendiente{pending.totalWarnings > 1 ? 's' : ''}
      </span>
    )
  }

  // No issues
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
      <CheckCircle2 className="w-3.5 h-3.5" />
      Sin novedad
    </span>
  )
}

function getPendingTitle(pending: PendingItems): string {
  const parts: string[] = []
  if (pending.nonCompliantCount > 0) parts.push(`${pending.nonCompliantCount} ítem(s) no conforme(s)`)
  if (pending.cylindersInPlant > 0) parts.push(`${pending.cylindersInPlant} cilindro(s) en planta`)
  if (!pending.hasSignature) parts.push('Sin firma del titular')
  if (!pending.hasPostMountPhotos) parts.push('Sin fotos post-montaje')
  if (!pending.hasCertificate) parts.push('Sin certificado')
  return parts.join(' · ') || 'Sin novedad'
}
