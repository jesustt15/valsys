import Link from 'next/link'
import { getUtpInspections } from '@/lib/services/utp'
import { UtpTable } from './utp-table'

export default async function UtpPage() {
  const inspections = await getUtpInspections()

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
          <li className="font-medium text-foreground">UTP</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inspecciones UTP</h1>
          <p className="text-muted-foreground mt-1">Inspecciones técnicas simplificadas</p>
        </div>
        <Link
          href="/utp/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                     text-white bg-green-600 rounded-lg hover:bg-green-500 transition-colors"
        >
          Nueva Inspección UTP
        </Link>
      </div>

      {/* Card wrapper */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {inspections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No hay inspecciones UTP registradas</p>
            <Link
              href="/utp/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                         text-white bg-green-600 rounded-lg hover:bg-green-500 transition-colors"
            >
              Crear primera inspección UTP
            </Link>
          </div>
        ) : (
          <UtpTable inspections={inspections} />
        )}
      </div>
    </div>
  )
}
