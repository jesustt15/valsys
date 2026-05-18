'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { DeleteUserButton } from '@/components/users/delete-user-button'
import type { UserRecord } from '@/lib/services/user'
import { Pencil } from 'lucide-react'

interface UsersTableProps {
  users: UserRecord[]
  currentUserId: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  operator: 'Operador',
  viewer: 'Visualizador',
}

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  operator: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  viewer: 'bg-muted text-muted-foreground',
}

export function UsersTable({ users, currentUserId }: UsersTableProps) {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return users.filter((u) => {
      const matchesQuery =
        !q ||
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)

      const matchesRole = roleFilter === 'all' || u.role === roleFilter

      return matchesQuery && matchesRole
    })
  }, [users, query, roleFilter])

  return (
    <div className="space-y-4">
      {/* Search & Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
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
            id="users-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por usuario, nombre o email..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background text-foreground
                       placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring
                       transition-colors"
          />
        </div>

        {/* Role filter */}
        <select
          id="users-role-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground
                     focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
        >
          <option value="all">Todos los roles</option>
          <option value="admin">Administrador</option>
          <option value="operator">Operador</option>
          <option value="viewer">Visualizador</option>
        </select>
      </div>

      {/* Results count */}
      {query || roleFilter !== 'all' ? (
        <p className="text-xs text-muted-foreground">
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} de {users.length}
        </p>
      ) : null}

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Usuario
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Nombre
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                Email
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Rol
              </th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((user) => (
              <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-foreground">
                  {user.username}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {user.fullName}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                  {user.email}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      ROLE_BADGE[user.role ?? 'viewer'] ?? ROLE_BADGE.viewer
                    }`}
                  >
                    {ROLE_LABELS[user.role ?? 'viewer'] ?? user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/users/${user.id}/edit`}
                      className="px-3 py-1 text-sm text-primary hover:bg-primary/10 rounded transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    {user.id !== currentUserId && (
                      <DeleteUserButton userId={user.id} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {query || roleFilter !== 'all'
              ? 'No se encontraron usuarios con ese criterio'
              : 'No hay usuarios registrados'}
          </div>
        )}
      </div>
    </div>
  )
}
