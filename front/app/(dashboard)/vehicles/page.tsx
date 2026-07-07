import Link from 'next/link'
import { VehiclesTable } from '@/components/vehicles/vehicles-table'
import { getAllVehicles } from '@/lib/services/vehicle'

export default async function VehiclesPage() {
  const vehicles = await getAllVehicles()

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
          <li className="font-medium text-foreground">Vehículos</li>
        </ol>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Vehículos</h1>
        <p className="text-muted-foreground mt-1">Listado de vehículos registrados</p>
      </div>

      {/* Card wrapper */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {vehicles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No hay vehículos registrados</p>
            <Link
              href="/vehicles/new"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                         text-white bg-green-600 rounded-lg hover:bg-green-500 transition-colors"
            >
              Crear primer vehículo
            </Link>
          </div>
        ) : (
          <VehiclesTable vehicles={vehicles} />
        )}
      </div>
    </div>
  )
}
