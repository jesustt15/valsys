'use client'

import { useActionState, useState } from 'react'
import { motion } from 'framer-motion'
import { createVehicle, type VehicleFormState } from '@/lib/actions/vehicle'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Truck } from 'lucide-react'

interface OwnerOption {
  id: string
  fullName: string
  documentId: string
}

export function VehicleForm({ owners }: { owners: OwnerOption[] }) {
  const [state, action, pending] = useActionState<VehicleFormState | null, FormData>(
    createVehicle,
    null
  )
  const [ownerId, setOwnerId] = useState('')

  const currentYear = new Date().getFullYear()

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
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle>Datos del Vehículo</CardTitle>
              <CardDescription>Ingrese los datos del vehículo a inspeccionar</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Dueño */}
          <div className="space-y-2">
            <Label htmlFor="ownerId" required>Dueño</Label>
            <SearchableSelect
              id="ownerId"
              name="ownerId"
              value={ownerId}
              onChange={setOwnerId}
              required
              disabled={pending}
              placeholder="— Seleccionar dueño —"
              options={owners.map(owner => ({
                value: owner.id,
                label: `${owner.fullName} (${owner.documentId})`
              }))}
            />
            {owners.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
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
            <div className="space-y-2">
              <Label htmlFor="vin" required>VIN (Chasis)</Label>
              <Input
                id="vin"
                name="vin"
                type="text"
                required
                maxLength={17}
                placeholder="1HGCM82633A004352"
                className="h-12 text-base font-mono uppercase"
                disabled={pending}
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value
                    .toUpperCase()
                    .replace(/[IOQ]/g, '')
                    .replace(/[^A-HJ-NPR-Z0-9]/g, '')
                }}
              />
              <p className="text-xs text-muted-foreground">17 caracteres (sin I, O, Q)</p>
            </div>

            {/* Patente */}
            <div className="space-y-2">
              <Label htmlFor="licensePlate" required>Patente</Label>
              <Input
                id="licensePlate"
                name="licensePlate"
                type="text"
                required
                maxLength={8}
                placeholder="ABC-123"
                className="h-12 text-base font-mono uppercase"
                disabled={pending}
                onInput={(e) => {
                  e.currentTarget.value = e.currentTarget.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '')
                }}
              />
              <p className="text-xs text-muted-foreground">Ej: ABC-123 o ABC123</p>
            </div>
          </div>

          {/* Tipo, Marca, Modelo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="vehicleType" required>Tipo</Label>
              <select
                id="vehicleType"
                name="vehicleType"
                required
                className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-base transition-all duration-200 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 bg-white dark:bg-card"
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
            <div className="space-y-2">
              <Label htmlFor="brand" required>Marca</Label>
              <Input
                id="brand"
                name="brand"
                type="text"
                required
                maxLength={50}
                placeholder="Ej: Ford"
                className="h-12 text-base"
                disabled={pending}
              />
            </div>

            {/* Modelo */}
            <div className="space-y-2">
              <Label htmlFor="model" required>Modelo</Label>
              <Input
                id="model"
                name="model"
                type="text"
                required
                maxLength={50}
                placeholder="Ej: F-150"
                className="h-12 text-base"
                disabled={pending}
              />
            </div>
          </div>

          {/* Año */}
          <div className="w-40 space-y-2">
            <Label htmlFor="year" required>Año</Label>
            <Input
              id="year"
              name="year"
              type="number"
              required
              min={1990}
              max={currentYear + 1}
              defaultValue={currentYear}
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
                Vehículo <strong>{state.data?.licensePlate}</strong> registrado correctamente
              </AlertDescription>
            </Alert>
          )}

          {/* Botones */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={pending}
              size="lg"
              className="h-12 min-w-[200px]"
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
                'Guardar Vehículo'
              )}
            </Button>

            {state?.success && (
              <a
                href="/vehicles/new"
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
