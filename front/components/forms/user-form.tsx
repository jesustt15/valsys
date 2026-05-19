'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createUserAction, updateUserAction, type UserFormState } from '@/lib/actions/user'
import type { UserRecord } from '@/lib/services/user'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, UserCog } from 'lucide-react'

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
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      action={formAction}
      className="space-y-6"
      noValidate
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
              <UserCog className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle>{mode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'}</CardTitle>
              <CardDescription>
                {mode === 'create'
                  ? 'Complete los datos para crear un nuevo usuario del sistema'
                  : 'Modifique los datos del usuario y guarde los cambios'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {mode === 'edit' && user && (
            <input type="hidden" name="id" value={user.id} />
          )}

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" required>Usuario</Label>
            <Input
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
              className="h-12 text-base"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">3-30 caracteres, sin espacios</p>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" required>Nombre completo</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              defaultValue={user?.fullName ?? ''}
              required
              minLength={3}
              maxLength={100}
              placeholder="Ej: Juan Pérez"
              className="h-12 text-base"
              disabled={isPending}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" required>Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={user?.email ?? ''}
              required
              placeholder="ej@correo.com"
              className="h-12 text-base"
              disabled={isPending}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Contraseña
              {mode === 'edit' && (
                <span className="text-muted-foreground font-normal ml-1">
                  (dejar vacío para mantener la actual)
                </span>
              )}
              {mode === 'create' && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required={mode === 'create'}
              minLength={6}
              placeholder={mode === 'create' ? 'Mínimo 6 caracteres' : ''}
              className="h-12 text-base"
              disabled={isPending}
            />
            {mode === 'create' && (
              <p className="text-xs text-muted-foreground">Mínimo 6 caracteres</p>
            )}
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role" required>Rol</Label>
            <select
              id="role"
              name="role"
              defaultValue={user?.role ?? 'operator'}
              required
              className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base transition-all duration-200 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 bg-white dark:bg-card"
              disabled={isPending}
            >
              <option value="admin">Administrador</option>
              <option value="operator">Operador</option>
              <option value="viewer">Visualizador</option>
            </select>
          </div>

          {/* Feedback */}
          {state?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {state?.success && (
            <Alert variant="success">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Usuario {mode === 'create' ? 'creado' : 'actualizado'} correctamente
              </AlertDescription>
            </Alert>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isPending} size="lg" className="h-12">
              {isPending ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Guardando...
                </div>
              ) : mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="h-12"
            >
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.form>
  )
}
