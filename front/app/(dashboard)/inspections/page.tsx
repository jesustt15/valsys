import Link from 'next/link'
import { InspectionsTable } from '@/components/inspections/inspections-table'
import { getAllInspections } from '@/lib/services/inspection'

export default async function InspectionsPage() {
  const inspections = await getAllInspections()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav>
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link href="/dashboard" className="hover:text-gray-700 transition-colors">
              Inicio
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900 font-medium">Inspecciones</li>
        </ol>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inspecciones</h1>
        <p className="text-muted-foreground mt-1">Listado de inspecciones realizadas</p>
      </div>

      {/* Card wrapper */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {inspections.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No hay inspecciones registradas</p>
            <Link
              href="/inspections/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                         text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
            >
              Crear primera inspección
            </Link>
          </div>
        ) : (
          <InspectionsTable inspections={inspections} />
        )}
      </div>
    </div>
  )
}
