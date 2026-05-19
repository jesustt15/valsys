import Link from 'next/link'
import { InspectionForm } from '@/components/forms/inspection-form'
import { getAllVehicles } from '@/lib/services/vehicle'

export default async function NewInspectionPage() {
  const vehicles = await getAllVehicles()

  const vehicleOptions = vehicles.map((v) => ({
    id: v.id,
    licensePlate: v.licensePlate,
    brand: v.brand,
    model: v.model,
  }))

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav>
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link href="/dashboard" className="hover:text-gray-700 transition-colors">
              Inicio
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href="/inspections" className="hover:text-gray-700 transition-colors">
              Inspecciones
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900 font-medium">Nueva</li>
        </ol>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nueva Inspección</h1>
        <p className="text-muted-foreground mt-1">
          Complete el formulario para registrar una nueva inspección inicial
        </p>
      </div>

      <InspectionForm vehicles={vehicleOptions} />
    </div>
  )
}
