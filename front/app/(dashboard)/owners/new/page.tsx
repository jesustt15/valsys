import Link from 'next/link'
import { OwnerForm } from '@/components/forms/owner-form'

export default function NewOwnerPage() {
  return (
    <div className="max-w-xl">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li>
            <Link href="/" className="hover:text-gray-700 transition-colors">
              Inicio
            </Link>
          </li>
          <li>/</li>
          <li className="text-gray-900 font-medium">Nuevo Dueño</li>
        </ol>
      </nav>

      {/* Card con el formulario */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <OwnerForm />
      </div>
    </div>
  )
}
