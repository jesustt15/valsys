'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

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
            id="owners-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o documento..."
            className="pl-9 h-11"
          />
        </div>

        <Link
          href="/owners/new"
          className="inline-flex items-center justify-center gap-2 h-11 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98]"
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
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
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
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((owner, i) => (
                <motion.tr
                  key={owner.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3.5 text-sm font-medium text-foreground font-mono">
                    {owner.documentId}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">
                    {owner.fullName}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground hidden sm:table-cell">
                    {owner.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground hidden sm:table-cell">
                    {owner.email ?? '—'}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground hidden sm:table-cell">
                    {owner.createdAt
                      ? new Date(owner.createdAt).toLocaleDateString('es-AR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/owners/${owner.id}`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition-colors"
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
              ? 'No se encontraron dueños con ese criterio'
              : owners.length === 0
                ? 'No hay dueños registrados. Cree el primero para comenzar.'
                : 'No hay dueños registrados'}
          </div>
        )}
      </Card>
    </motion.div>
  )
}
