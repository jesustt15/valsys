import Link from 'next/link'
import { VehicleForm } from '@/components/forms/vehicle-form'
import { getOwnersList } from '@/lib/actions/vehicle'

export default async function NewVehiclePage() {
  const owners = await getOwnersList()

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link href="/" className="hover:text-gray-700 transition-colors">
              Inicio
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900 font-medium">Nuevo Vehículo</li>
        </ol>
      </nav>

      {/* Card con el formulario */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <VehicleForm owners={owners} />
      </div>
    </div>
  )
}
