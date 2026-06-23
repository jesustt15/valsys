'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface VehiclesTableProps {
  vehicles: Array<{
    id: string
    codigoUnicoGnc: string | null
    licensePlate: string
    vehicleType: string
    brand: string | null
    model: string | null
    marcaKit: string | null
    createdAt: Date | null
  }>
}

const TYPE_LABELS: Record<string, string> = {
  sedan: 'Sedán',
  autobus: 'Autobús',
  camion: 'Camión',
  pickup: 'Pick Up',
  camioneta: 'Camioneta',
  van: 'Van',
}

export function VehiclesTable({ vehicles }: VehiclesTableProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return vehicles
    return vehicles.filter(
      (v) =>
        v.licensePlate.toLowerCase().includes(q) ||
        (v.codigoUnicoGnc ?? '').toLowerCase().includes(q) ||
        (v.brand ?? '').toLowerCase().includes(q) ||
        (v.model ?? '').toLowerCase().includes(q) ||
        (v.marcaKit ?? '').toLowerCase().includes(q),
    )
  }, [vehicles, query])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Search bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="vehicles-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por placa, Código Único, marca, modelo o kit..."
            className="pl-9 h-11"
          />
        </div>

        <Link
          href="/vehicles/new"
          className="inline-flex items-center justify-center gap-2 h-11 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Nuevo Vehículo
        </Link>
      </div>

      {/* Results count */}
      {query ? (
        <p className="text-xs text-muted-foreground">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} de {vehicles.length}
        </p>
      ) : null}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Patente
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  Código Único GNC
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Marca / Modelo
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  Tipo
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  Marca KIT GNC
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((v, i) => (
                <motion.tr
                  key={v.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3.5 text-sm font-medium text-foreground font-mono">
                    {v.licensePlate}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground font-mono hidden sm:table-cell">
                    {v.codigoUnicoGnc ?? '—'}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-foreground">
                    {v.brand && v.model
                      ? `${v.brand} ${v.model}`
                      : v.brand || v.model || '—'}
                  </td>
                  <td className="px-4 py-3.5 text-sm hidden sm:table-cell">
                    <Badge variant="secondary">{TYPE_LABELS[v.vehicleType] ?? v.vehicleType}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground hidden sm:table-cell">
                    {v.marcaKit ?? '—'}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/vehicles/${v.id}`}
                      className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-secondary hover:text-secondary-foreground transition-all"
                      title="Ver Perfil"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {query
              ? 'No se encontraron vehículos con ese criterio'
              : vehicles.length === 0
                ? 'No hay vehículos registrados. Cree el primero para comenzar.'
                : 'No hay vehículos registrados'}
          </div>
        )}
      </Card>
    </motion.div>
  )
}
