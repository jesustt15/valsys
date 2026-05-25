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
    kmCurrent: number
    operatorName: string | null
  }>
  pendingSummaries?: Record<string, PendingItems>
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

export function InspectionsTable({ inspections, pendingSummaries = {} }: InspectionsTableProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [pendingFilter, setPendingFilter] = useState<string>('all')
  const [operatorFilter, setOperatorFilter] = useState<string>('all')

  // Extract unique operator names for the filter
  const operators = useMemo(() => {
    const names = new Set(inspections.map((i) => i.operatorName).filter(Boolean))
    return Array.from(names).sort()
  }, [inspections])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return inspections.filter((i) => {
      const matchesQuery =
        !q || (i.licensePlate ?? '').toLowerCase().includes(q)

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
  }, [inspections, query, statusFilter, pendingFilter, operatorFilter, pendingSummaries])

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

        <select
          id="inspections-pending-filter"
          value={pendingFilter}
          onChange={(e) => setPendingFilter(e.target.value)}
          className="flex h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
        >
          <option value="all">Todas las pendientes</option>
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
          <option value="all">Todos los operadores</option>
          {operators.map((name) => (
            <option key={name} value={name!}>{name}</option>
          ))}
        </select>

        <Link
          href="/inspections/new"
          className="inline-flex items-center justify-center gap-2 h-11 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Nueva Inspección
        </Link>
      </div>

      {/* Results count */}
      {query || statusFilter !== 'all' || pendingFilter !== 'all' || operatorFilter !== 'all' ? (
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
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                  Pendientes
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  Km
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
                    {insp.kmCurrent.toLocaleString('es-AR')}
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
            {query || statusFilter !== 'all' || pendingFilter !== 'all' || operatorFilter !== 'all'
              ? 'No se encontraron inspecciones con esos filtros'
              : inspections.length === 0
                ? 'No hay inspecciones registradas. Cree la primera para comenzar.'
                : 'No hay inspecciones registradas'}
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

  // Finalizado con todo ok
  if (status === 'finalizado' && pending.totalPending === 0 && pending.hasFinalCert) {
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
  if (!pending.hasFinalCert) parts.push('Sin certificado final')
  return parts.join(' · ') || 'Sin novedad'
}
