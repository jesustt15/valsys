'use client'

import { useActionState } from 'react'
import { createOwner, type OwnerFormState } from '@/lib/actions/owner'

export function OwnerForm() {
  const [state, action, pending] = useActionState<OwnerFormState | null>(
    createOwner,
    null
  )

  return (
    <form action={action} className="space-y-5" noValidate>
      {/* Encabezado */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Datos del Dueño</h2>
        <p className="mt-1 text-sm text-gray-500">
          Ingrese los datos del titular del vehículo
        </p>
      </div>

      {/* Nombre completo */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
          Nombre completo <span className="text-red-500">*</span>
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          maxLength={50}
          placeholder="Ej: Juan Pérez"
          pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{3,50}"
          title="Solo letras y espacios, mínimo 3 caracteres"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                     placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={pending}
        />
        <p className="mt-1 text-xs text-gray-400">Solo letras y espacios</p>
      </div>

      {/* Documento: tipo + número */}
      <div className="flex gap-3">
        {/* Tipo de documento */}
        <div className="w-28">
          <label htmlFor="documentType" className="block text-sm font-medium text-gray-700">
            Tipo <span className="text-red-500">*</span>
          </label>
          <select
            id="documentType"
            name="documentType"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                       focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={pending}
          >
            <option value="">—</option>
            <option value="V">V</option>
            <option value="E">E</option>
            <option value="J">J</option>
          </select>
        </div>

        {/* Número de documento */}
        <div className="flex-1">
          <label htmlFor="documentNumber" className="block text-sm font-medium text-gray-700">
            Número <span className="text-red-500">*</span>
          </label>
          <input
            id="documentNumber"
            name="documentNumber"
            type="text"
            required
            maxLength={10}
            placeholder="Ej: 12345678"
            pattern="\d{6,10}"
            title="6 a 10 dígitos numéricos"
            inputMode="numeric"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                       placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={pending}
            onInput={(e) => {
              e.currentTarget.value = e.currentTarget.value.replace(/[^\d]/g, '')
            }}
          />
          <p className="mt-1 text-xs text-gray-400">6 a 10 dígitos</p>
        </div>
      </div>

      {/* Teléfono */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Teléfono
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          maxLength={20}
          placeholder="Ej: 0414-1234567"
          pattern="[\d\s\-\(\)\+]{7,20}"
          title="Solo números, guiones y paréntesis"
          inputMode="tel"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                     placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={pending}
          onInput={(e) => {
            e.currentTarget.value = e.currentTarget.value.replace(/[^\d\s\-\(\)\+]/g, '')
          }}
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="ej@correo.com"
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
            Dueño <strong>{state.data?.fullName}</strong> registrado correctamente
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
            'Guardar Dueño'
          )}
        </button>

        {state?.success && (
          <a
            href="/owners/new"
            className="text-sm text-blue-600 hover:text-blue-500 font-medium"
          >
            + Cargar otro
          </a>
        )}
      </div>
    </form>
  )
}
