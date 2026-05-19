'use client'

import { useActionState } from 'react'
import { motion } from 'framer-motion'
import { createOwner, type OwnerFormState } from '@/lib/actions/owner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, UserPlus } from 'lucide-react'

export function OwnerForm() {
  const [state, action, pending] = useActionState<OwnerFormState | null>(
    createOwner,
    null
  )

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      action={action}
      className="space-y-6"
      noValidate
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle>Datos del Dueño</CardTitle>
              <CardDescription>Ingrese los datos del titular del vehículo</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Nombre completo */}
          <div className="space-y-2">
            <Label htmlFor="fullName" required>Nombre completo</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              required
              maxLength={50}
              placeholder="Ej: Juan Pérez"
              pattern="[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{3,50}"
              title="Solo letras y espacios, mínimo 3 caracteres"
              className="h-12 text-base"
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">Solo letras y espacios, mínimo 3 caracteres</p>
          </div>

          {/* Documento: tipo + número */}
          <div className="flex gap-4">
            {/* Tipo de documento */}
            <div className="w-28 space-y-2">
              <Label htmlFor="documentType" required>Tipo</Label>
              <select
                id="documentType"
                name="documentType"
                required
                className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base transition-all duration-200 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                disabled={pending}
              >
                <option value="">—</option>
                <option value="V">V</option>
                <option value="E">E</option>
                <option value="J">J</option>
              </select>
            </div>

            {/* Número de documento */}
            <div className="flex-1 space-y-2">
              <Label htmlFor="documentNumber" required>Número</Label>
              <Input
                id="documentNumber"
                name="documentNumber"
                type="text"
                required
                maxLength={10}
                placeholder="Ej: 12345678"
                pattern="\d{6,10}"
                title="6 a 10 dígitos numéricos"
                inputMode="numeric"
                className="h-12 text-base"
                disabled={pending}
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value.replace(/[^\d]/g, '')
                }}
              />
              <p className="text-xs text-muted-foreground">6 a 10 dígitos</p>
            </div>
          </div>

          {/* Teléfono */}
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              maxLength={20}
              placeholder="Ej: 0414-1234567"
              pattern="[\d\s\-\(\)\+]{7,20}"
              title="Solo números, guiones y paréntesis"
              inputMode="tel"
              className="h-12 text-base"
              disabled={pending}
              onInput={(e) => {
                e.currentTarget.value = e.currentTarget.value.replace(/[^\d\s\-\(\)\+]/g, '')
              }}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="ej@correo.com"
              className="h-12 text-base"
              disabled={pending}
            />
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
                Dueño <strong>{state.data?.fullName}</strong> registrado correctamente
              </AlertDescription>
            </Alert>
          )}

          {/* Botones */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={pending}
              size="lg"
              className="h-12 min-w-[180px]"
            >
              {pending ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Guardando...
                </div>
              ) : (
                'Guardar Dueño'
              )}
            </Button>

            {state?.success && (
              <a
                href="/owners/new"
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                + Cargar otro
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.form>
  )
}
