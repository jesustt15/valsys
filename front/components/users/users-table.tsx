'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { DeleteUserButton } from '@/components/users/delete-user-button'
import type { UserRecord } from '@/lib/services/user'
import { Pencil, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface UsersTableProps {
  users: UserRecord[]
  currentUserId: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  operator: 'Operador',
  viewer: 'Visualizador',
}

const ROLE_BADGE: Record<string, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  operator: 'secondary',
  viewer: 'outline',
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
            id="users-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por usuario, nombre o email..."
            className="pl-9 h-11"
          />
        </div>

        <select
          id="users-role-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="flex h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
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
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Usuario
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Nombre
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:tableCell">
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
              {filtered.map((user, i) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3.5 text-sm font-medium text-foreground">
                    {user.username}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">
                    {user.fullName}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground hidden sm:tableCell">
                    {user.email}
                  </td>
                  <td className="px-4 py-3.5 text-sm">
                    <Badge variant={ROLE_BADGE[user.role ?? 'viewer'] ?? 'outline'}>
                      {ROLE_LABELS[user.role ?? 'viewer'] ?? user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/users/${user.id}/edit`}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      {user.id !== currentUserId && (
                        <DeleteUserButton userId={user.id} />
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {query || roleFilter !== 'all'
              ? 'No se encontraron usuarios con ese criterio'
              : 'No hay usuarios registrados'}
          </div>
        )}
      </Card>
    </motion.div>
  )
}
