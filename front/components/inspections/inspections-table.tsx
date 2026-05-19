'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'

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

const STATUS_BADGE: Record<string, string> = {
  inspeccion_inicial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  en_planta: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  finalizado: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
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
    <div className="space-y-4">
      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            id="inspections-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por patente..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background text-foreground
                       placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring
                       transition-colors"
          />
        </div>

        <select
          id="inspections-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground
                     focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
        >
          <option value="all">Todos los estados</option>
          <option value="inspeccion_inicial">Inspección Inicial</option>
          <option value="en_planta">En Planta</option>
          <option value="finalizado">Finalizado</option>
        </select>

        <Link
          href="/inspections/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium
                     text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Inspección
        </Link>
      </div>

      {/* Results count */}
      {query || statusFilter !== 'all' ? (
        <p className="text-xs text-muted-foreground">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} de {inspections.length}
        </p>
      ) : null}

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
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
            {filtered.map((insp) => (
              <tr key={insp.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {insp.inspectionDate
                    ? new Date(insp.inspectionDate).toLocaleDateString('es-AR')
                    : '—'}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-foreground font-mono">
                  {insp.licensePlate ?? '—'}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                  {insp.brand && insp.model
                    ? `${insp.brand} ${insp.model}`
                    : insp.brand || insp.model || '—'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      STATUS_BADGE[insp.status] ?? 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {STATUS_LABELS[insp.status] ?? insp.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                  {insp.kmCurrent.toLocaleString('es-AR')}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                  {insp.operatorName ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {query || statusFilter !== 'all'
              ? 'No se encontraron inspecciones con ese criterio'
              : inspections.length === 0
                ? 'No hay inspecciones registradas. Cree la primera para comenzar.'
                : 'No hay inspecciones registradas'}
          </div>
        )}
      </div>
    </div>
  )
}
