'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'

interface OwnersTableProps {
  owners: Array<{
    id: string
    documentId: string
    fullName: string
    phone: string | null
    email: string | null
    createdAt: Date | null
  }>
}

export function OwnersTable({ owners }: OwnersTableProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return owners
    return owners.filter(
      (o) =>
        o.fullName.toLowerCase().includes(q) ||
        o.documentId.toLowerCase().includes(q),
    )
  }, [owners, query])

  return (
    <div className="space-y-4">
      {/* Search bar */}
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
            id="owners-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o documento..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background text-foreground
                       placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring
                       transition-colors"
          />
        </div>

        <Link
          href="/owners/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium
                     text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Dueño
        </Link>
      </div>

      {/* Results count */}
      {query ? (
        <p className="text-xs text-muted-foreground">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} de {owners.length}
        </p>
      ) : null}

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Documento
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Nombre
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                Teléfono
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                Email
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                Creado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((owner) => (
              <tr key={owner.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-foreground font-mono">
                  {owner.documentId}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {owner.fullName}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                  {owner.phone ?? '—'}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                  {owner.email ?? '—'}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                  {owner.createdAt
                    ? new Date(owner.createdAt).toLocaleDateString('es-AR')
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {query
              ? 'No se encontraron dueños con ese criterio'
              : owners.length === 0
                ? 'No hay dueños registrados. Cree el primero para comenzar.'
                : 'No hay dueños registrados'}
          </div>
        )}
      </div>
    </div>
  )
}
