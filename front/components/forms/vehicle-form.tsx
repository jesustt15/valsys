'use client'

import { useActionState } from 'react'
import { createVehicle, type VehicleFormState } from '@/lib/actions/vehicle'

interface OwnerOption {
  id: string
  fullName: string
  documentId: string
}

export function VehicleForm({ owners }: { owners: OwnerOption[] }) {
  const [state, action, pending] = useActionState<VehicleFormState | null>(
    createVehicle,
    null
  )

  const currentYear = new Date().getFullYear()

  return (
    <form action={action} className="space-y-5" noValidate>
      {/* Encabezado */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Datos del Vehículo</h2>
        <p className="mt-1 text-sm text-gray-500">
          Ingrese los datos del vehículo a inspeccionar
        </p>
      </div>

      {/* Dueño */}
      <div>
        <label htmlFor="ownerId" className="block text-sm font-medium text-gray-700">
          Dueño <span className="text-red-500">*</span>
        </label>
        <select
          id="ownerId"
          name="ownerId"
          required
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                     focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed bg-white"
          disabled={pending}
        >
          <option value="">— Seleccionar dueño —</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.fullName} ({owner.documentId})
            </option>
          ))}
        </select>
        {owners.length === 0 && (
          <p className="mt-1 text-xs text-amber-600">
            No hay dueños registrados.{' '}
            <a href="/owners/new" className="underline hover:text-amber-700">
              Crear uno primero
            </a>
          </p>
        )}
      </div>

      {/* VIN y Patente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* VIN */}
        <div>
          <label htmlFor="vin" className="block text-sm font-medium text-gray-700">
            VIN (Chasis) <span className="text-red-500">*</span>
          </label>
          <input
            id="vin"
            name="vin"
            type="text"
            required
            maxLength={17}
            placeholder="1HGCM82633A004352"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                       font-mono placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                       disabled:opacity-50 disabled:cursor-not-allowed uppercase"
            disabled={pending}
            onInput={(e) => {
              e.currentTarget.value = e.currentTarget.value
                .toUpperCase()
                .replace(/[IOQ]/g, '')
                .replace(/[^A-HJ-NPR-Z0-9]/g, '')
            }}
          />
          <p className="mt-1 text-xs text-gray-400">17 caracteres (sin I, O, Q)</p>
        </div>

        {/* Patente */}
        <div>
          <label htmlFor="licensePlate" className="block text-sm font-medium text-gray-700">
            Patente <span className="text-red-500">*</span>
          </label>
          <input
            id="licensePlate"
            name="licensePlate"
            type="text"
            required
            maxLength={8}
            placeholder="ABC-123"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                       font-mono placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                       disabled:opacity-50 disabled:cursor-not-allowed uppercase"
            disabled={pending}
            onInput={(e) => {
              e.currentTarget.value = e.currentTarget.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
            }}
          />
          <p className="mt-1 text-xs text-gray-400">Ej: ABC-123 o ABC123</p>
        </div>
      </div>

      {/* Tipo, Marca, Modelo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Tipo */}
        <div>
          <label htmlFor="vehicleType" className="block text-sm font-medium text-gray-700">
            Tipo <span className="text-red-500">*</span>
          </label>
          <select
            id="vehicleType"
            name="vehicleType"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                       focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                       disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            disabled={pending}
          >
            <option value="">—</option>
            <option value="camion">Camión</option>
            <option value="pickup">Pickup</option>
            <option value="furgon">Furgón</option>
            <option value="van">Van</option>
            <option value="acoplado">Acoplado</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        {/* Marca */}
        <div>
          <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
            Marca <span className="text-red-500">*</span>
          </label>
          <input
            id="brand"
            name="brand"
            type="text"
            required
            maxLength={50}
            placeholder="Ej: Ford"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                       placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={pending}
          />
        </div>

        {/* Modelo */}
        <div>
          <label htmlFor="model" className="block text-sm font-medium text-gray-700">
            Modelo <span className="text-red-500">*</span>
          </label>
          <input
            id="model"
            name="model"
            type="text"
            required
            maxLength={50}
            placeholder="Ej: F-150"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                       placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={pending}
          />
        </div>
      </div>

      {/* Año */}
      <div className="w-40">
        <label htmlFor="year" className="block text-sm font-medium text-gray-700">
          Año <span className="text-red-500">*</span>
        </label>
        <input
          id="year"
          name="year"
          type="number"
          required
          min={1990}
          max={currentYear + 1}
          defaultValue={currentYear}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                     placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={pending}
        />
      </div>

      {/* Feedback */}
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      {state?.success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
          <p className="text-sm text-green-700">
            Vehículo <strong>{state.data?.licensePlate}</strong> registrado correctamente
          </p>
        </div>
      )}

      {/* Botón */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold
                     text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500
                     focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Guardando...
            </>
          ) : (
            'Guardar Vehículo'
          )}
        </button>

        {state?.success && (
          <a
            href="/vehicles/new"
            className="text-sm text-blue-600 hover:text-blue-500 font-medium"
          >
            + Cargar otro
          </a>
        )}
      </div>
    </form>
  )
}
