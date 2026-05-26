'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { changePasswordAction } from '@/lib/actions/settings'
import { Lock, Eye, EyeOff } from 'lucide-react'

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, null)
  const router = useRouter()
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  if (state?.success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Contraseña actualizada</h3>
        <p className="text-muted-foreground mb-6">
          Tu contraseña se cambió correctamente.
        </p>
        <Button onClick={() => router.push('/dashboard')}>
          Volver al dashboard
        </Button>
      </motion.div>
    )
  }

  return (
    <form action={action} className="space-y-5">
      {/* Current password */}
      <div>
        <label
          htmlFor="currentPassword"
          className="block text-sm font-medium mb-1.5"
        >
          Contraseña actual
        </label>
        <div className="relative">
          <Input
            id="currentPassword"
            name="currentPassword"
            type={showCurrent ? 'text' : 'password'}
            placeholder="Ingresá tu contraseña actual"
            required
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showCurrent ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showCurrent ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* New password */}
      <div>
        <label
          htmlFor="newPassword"
          className="block text-sm font-medium mb-1.5"
        >
          Nueva contraseña
        </label>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showNew ? 'text' : 'password'}
            placeholder="Mínimo 6 caracteres"
            required
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showNew ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Confirm password */}
      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium mb-1.5"
        >
          Confirmar nueva contraseña
        </label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Repetí la nueva contraseña"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showConfirm ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {state?.error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-destructive bg-destructive/10 rounded-xl p-3"
        >
          {state.error}
        </motion.p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Guardando...' : 'Cambiar contraseña'}
      </Button>
    </form>
  )
}
