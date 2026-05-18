'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createUserAction, updateUserAction, type UserFormState } from '@/lib/actions/user'
import type { UserRecord } from '@/lib/services/user'

interface UserFormProps {
  mode: 'create' | 'edit'
  user?: UserRecord
}

const inputClass = `
  mt-1 block w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm shadow-sm
  placeholder:text-muted-foreground
  focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-colors
`.trim()

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
        <h2 className="text-lg font-semibold text-foreground">
          {mode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
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
        <label htmlFor="username" className="block text-sm font-medium text-foreground">
          Usuario <span className="text-destructive">*</span>
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
          className={inputClass}
          disabled={isPending}
        />
        <p className="mt-1 text-xs text-muted-foreground">3-30 caracteres, sin espacios</p>
      </div>

      {/* Full Name */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-foreground">
          Nombre completo <span className="text-destructive">*</span>
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
          className={inputClass}
          disabled={isPending}
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email <span className="text-destructive">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={user?.email ?? ''}
          required
          placeholder="ej@correo.com"
          className={inputClass}
          disabled={isPending}
        />
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          Contraseña{' '}
          {mode === 'edit' && (
            <span className="text-muted-foreground font-normal">
              (dejar vacío para mantener la actual)
            </span>
          )}
          <span className="text-destructive">{mode === 'create' ? ' *' : ''}</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required={mode === 'create'}
          minLength={6}
          placeholder={mode === 'create' ? 'Mínimo 6 caracteres' : ''}
          className={inputClass}
          disabled={isPending}
        />
        {mode === 'create' && (
          <p className="mt-1 text-xs text-muted-foreground">Mínimo 6 caracteres</p>
        )}
      </div>

      {/* Role */}
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-foreground">
          Rol <span className="text-destructive">*</span>
        </label>
        <select
          id="role"
          name="role"
          defaultValue={user?.role ?? 'operator'}
          required
          className={inputClass}
          disabled={isPending}
        >
          <option value="admin">Administrador</option>
          <option value="operator">Operador</option>
          <option value="viewer">Visualizador</option>
        </select>
      </div>

      {/* Error feedback */}
      {state?.error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
          <p className="text-sm text-destructive">{state.error}</p>
        </div>
      )}

      {/* Success feedback */}
      {state?.success && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3">
          <p className="text-sm text-green-600 dark:text-green-400">
            Usuario {mode === 'create' ? 'creado' : 'actualizado'} correctamente
          </p>
        </div>
      )}

      {/* Botones */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold
                     text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2
                     focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
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
          className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
