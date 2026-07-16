'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'
import type { UtpInspectionRow } from '@/lib/services/utp'

const STATUS_LABELS: Record<string, string> = {
  inspeccion_inicial: 'Inspección Inicial',
  standby: 'Standby',
  certificado: 'Certificado',
}

const STATUS_BADGE: Record<string, 'info' | 'warning' | 'success' | 'destructive'> = {
  inspeccion_inicial: 'info',
  standby: 'warning',
  certificado: 'success',
}

const STATUS_TABS = [
  { value: 'all', label: 'Todas' },
  { value: 'inspeccion_inicial', label: 'Inicial' },
  { value: 'standby', label: 'Standby' },
  { value: 'certificado', label: 'Certificadas' },
] as const

const DATE_FORMAT = new Intl.DateTimeFormat('es-VE', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDate(d: Date | null): string {
  if (!d) return '—'
  return DATE_FORMAT.format(new Date(d))
}

interface Props {
  inspections: UtpInspectionRow[]
}

export function UtpTable({ inspections }: Props) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    let rows = inspections

    if (statusFilter !== 'all') {
      rows = rows.filter((r) => r.status === statusFilter)
    }

    if (query.trim()) {
      const q = query.toLowerCase()
      rows = rows.filter(
        (r) =>
          (r.licensePlate?.toLowerCase().includes(q) ?? false) ||
          (r.ownerName?.toLowerCase().includes(q) ?? false) ||
          (r.correlativeNumber?.toLowerCase().includes(q) ?? false) ||
          (r.operatorName?.toLowerCase().includes(q) ?? false),
      )
    }

    return rows
  }, [inspections, query, statusFilter])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, dueño, correlativo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === tab.value
                  ? 'bg-green-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-3 px-3 font-medium">Fecha</th>
              <th className="py-3 px-3 font-medium">Placa</th>
              <th className="py-3 px-3 font-medium">Dueño</th>
              <th className="py-3 px-3 font-medium">Estado</th>
              <th className="py-3 px-3 font-medium">Correlativo</th>
              <th className="py-3 px-3 font-medium">Operador</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => window.location.href = `/utp/${row.id}`}>
                  <td className="py-3 px-3">
                    <Link href={`/utp/${row.id}`} className="text-foreground hover:text-green-600 transition-colors" onClick={(e) => e.stopPropagation()}>
                      {formatDate(row.inspectionDate)}
                    </Link>
                  </td>
                  <td className="py-3 px-3 font-mono">
                    <Link href={`/utp/${row.id}`} className="hover:text-green-600 transition-colors" onClick={(e) => e.stopPropagation()}>
                      {row.licensePlate ?? '—'}
                    </Link>
                  </td>
                  <td className="py-3 px-3">
                    <Link href={`/utp/${row.id}`} className="hover:text-green-600 transition-colors" onClick={(e) => e.stopPropagation()}>
                      {row.ownerName ?? '—'}
                    </Link>
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant={STATUS_BADGE[row.status] ?? 'info'}>
                      {STATUS_LABELS[row.status] ?? row.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 font-mono text-xs">
                    <Link href={`/utp/${row.id}`} className="hover:text-green-600 transition-colors" onClick={(e) => e.stopPropagation()}>
                      {row.correlativeNumber ?? '—'}
                    </Link>
                  </td>
                  <td className="py-3 px-3 text-muted-foreground">{row.operatorName ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
