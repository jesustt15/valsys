import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { getAllUsers } from '@/lib/services/user'
import { UsersTable } from '@/components/users/users-table'

export default async function UsersListPage() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    redirect('/dashboard')
  }

  const users = await getAllUsers()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona los usuarios del sistema
          </p>
        </div>
        <Link
          href="/admin/users/new"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium transition-colors"
        >
          Nuevo usuario
        </Link>
      </div>

      {/* Table with search — Client Component */}
      <UsersTable users={users} currentUserId={session.sub} />
    </div>
  )
}
