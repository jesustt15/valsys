'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateVehicleAction, type VehicleFormState } from '@/lib/actions/vehicle'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle } from 'lucide-react'

interface Props {
  vehicle: {
    id: string
    codigoUnicoGnc: string | null
    licensePlate: string | null
    vehicleType: string | null
    brand: string | null
    model: string | null
    marcaKit: string | null
  }
}

const VEHICLE_TYPES = [
  { value: 'sedan', label: 'Sedán' },
  { value: 'autobus', label: 'Autobús' },
  { value: 'camion', label: 'Camión' },
  { value: 'pickup', label: 'Pick Up' },
  { value: 'camioneta', label: 'Camioneta' },
  { value: 'van', label: 'Van' },
]

export function EditVehicleModal({ vehicle }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const [state, action, pending] = useActionState(
    async (_prev: VehicleFormState | null, formData: FormData) => {
      formData.set('id', vehicle.id)
      const result = await updateVehicleAction(_prev, formData)
      if (result.success) {
        router.refresh()
        setOpen(false)
      }
      return result
    },
    null,
  )

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Editar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>Editar Vehículo</DialogTitle>
          <DialogClose onClick={() => setOpen(false)} />
        </DialogHeader>

        <form action={action}>
          <DialogContent>
            {state?.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            {state?.success && (
              <Alert variant="success">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>Vehículo actualizado correctamente</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="codigoUnicoGnc">Código Único GNC</Label>
              <Input
                id="codigoUnicoGnc"
                name="codigoUnicoGnc"
                defaultValue={vehicle.codigoUnicoGnc ?? ''}
                maxLength={50}
                placeholder="Código Único GNC (Opcional)"
                disabled={pending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="licensePlate" required>Patente</Label>
              <Input
                id="licensePlate"
                name="licensePlate"
                defaultValue={vehicle.licensePlate ?? ''}
                maxLength={8}
                placeholder="ABC-123"
                disabled={pending}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand" required>Marca</Label>
                <Input
                  id="brand"
                  name="brand"
                  defaultValue={vehicle.brand ?? ''}
                  placeholder="Marca"
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model" required>Modelo</Label>
                <Input
                  id="model"
                  name="model"
                  defaultValue={vehicle.model ?? ''}
                  placeholder="Modelo"
                  disabled={pending}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marcaKit">Marca de KIT GNC</Label>
                <Input
                  id="marcaKit"
                  name="marcaKit"
                  defaultValue={vehicle.marcaKit ?? ''}
                  placeholder="Marca de KIT (Opcional)"
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleType" required>Tipo</Label>
                <select
                  id="vehicleType"
                  name="vehicleType"
                  defaultValue={vehicle.vehicleType ?? ''}
                  className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm transition-all duration-200 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={pending}
                >
                  <option value="" disabled>Seleccionar...</option>
                  {VEHICLE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </DialogContent>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  )
}
