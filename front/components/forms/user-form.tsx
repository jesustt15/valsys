'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createUserAction, updateUserAction, type UserFormState } from '@/lib/actions/user'
import type { UserRecord } from '@/lib/services/user'

interface UserFormProps {
  mode: 'create' | 'edit'
  user?: UserRecord
}

export function UserForm({ mode, user }: UserFormProps) {
  const router = useRouter()
  const action = mode === 'create' ? createUserAction : updateUserAction
  const [state, formAction, isPending] = useActionState<UserFormState | null, FormData>(action, null)

  useEffect(() => {
    if (state?.success) {
      router.push('/admin/users')
    }
  }, [state?.success, router])

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {/* Encabezado */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          {mode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {mode === 'create'
            ? 'Complete los datos para crear un nuevo usuario del sistema'
            : 'Modifique los datos del usuario y guarde los cambios'}
        </p>
      </div>

      {mode === 'edit' && user && (
        <input type="hidden" name="id" value={user.id} />
      )}

      {/* Username */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-700">
          Usuario <span className="text-red-500">*</span>
        </label>
        <input
          id="username"
          name="username"
          type="text"
          defaultValue={user?.username ?? ''}
          required
          minLength={3}
          maxLength={30}
          pattern="^[a-zA-Z0-9_.-]+$"
          title="Solo letras, números, guiones, puntos y guiones bajos"
          placeholder="Ej: jperez"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                     placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isPending}
        />
        <p className="mt-1 text-xs text-gray-400">3-30 caracteres, sin espacios</p>
      </div>

      {/* Full Name */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
          Nombre completo <span className="text-red-500">*</span>
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          defaultValue={user?.fullName ?? ''}
          required
          minLength={3}
          maxLength={100}
          placeholder="Ej: Juan Pérez"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                     placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isPending}
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={user?.email ?? ''}
          required
          placeholder="ej@correo.com"
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                     placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isPending}
        />
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Contraseña {mode === 'edit' && <span className="text-gray-500 font-normal">(dejar vacío para mantener la actual)</span>}
          <span className="text-red-500">{mode === 'create' ? ' *' : ''}</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required={mode === 'create'}
          minLength={6}
          placeholder={mode === 'create' ? 'Mínimo 6 caracteres' : ''}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                     placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isPending}
        />
        {mode === 'create' && (
          <p className="mt-1 text-xs text-gray-400">Mínimo 6 caracteres</p>
        )}
      </div>

      {/* Role */}
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
          Rol <span className="text-red-500">*</span>
        </label>
        <select
          id="role"
          name="role"
          defaultValue={user?.role ?? 'operator'}
          required
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm
                     focus:border-blue-500 focus:ring-1 focus:ring-blue-500
                     disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isPending}
        >
          <option value="admin">Administrador</option>
          <option value="operator">Operador</option>
          <option value="viewer">Visualizador</option>
        </select>
      </div>

      {/* Error feedback */}
      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}

      {/* Success feedback */}
      {state?.success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3">
          <p className="text-sm text-green-700">
            Usuario {mode === 'create' ? 'creado' : 'actualizado'} correctamente
          </p>
        </div>
      )}

      {/* Botones */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold
                     text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500
                     focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Guardando...
            </>
          ) : mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-600 hover:text-gray-500 font-medium"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
