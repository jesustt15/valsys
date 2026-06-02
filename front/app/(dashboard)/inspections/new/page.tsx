import Link from 'next/link'
import { UnifiedInspectionForm } from '@/components/forms/unified-inspection-form'
import { getAllOwners } from '@/lib/services/owner'
import { getAllVehicles } from '@/lib/services/vehicle'

export default async function NewInspectionPage() {
  const [owners, vehicles] = await Promise.all([getAllOwners(), getAllVehicles()])

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
        <h1 className="text-2xl font-bold text-foreground">Nuevo Ingreso</h1>
        <p className="text-muted-foreground mt-1">
          Ingreso unificado: Cilindros montados (inspección completa) o desmontados (solo registro)
        </p>
      </div>

      <UnifiedInspectionForm owners={owners} vehicles={vehicles} />
    </div>
  )
}
