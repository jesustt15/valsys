import Link from 'next/link'
import { OwnersTable } from '@/components/owners/owners-table'
import { getAllOwners } from '@/lib/services/owner'

export default async function OwnersPage() {
  const owners = await getAllOwners()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav>
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Inicio
            </Link>
          </li>
          <li className="text-muted-foreground">/</li>
          <li className="font-medium text-foreground">Dueños</li>
        </ol>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dueños</h1>
        <p className="text-muted-foreground mt-1">Listado de titulares de vehículos</p>
      </div>

      {/* Card wrapper */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {owners.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No hay dueños registrados</p>
            <Link
              href="/owners/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                         text-white bg-green-600 rounded-lg hover:bg-green-500 transition-colors"
            >
              Crear primer dueño
            </Link>
          </div>
        ) : (
          <OwnersTable owners={owners} />
        )}
      </div>
    </div>
  )
}
