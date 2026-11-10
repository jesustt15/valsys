'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateOwnerAction, reassignVehicleToOwnerAction, type OwnerFormState } from '@/lib/actions/owner'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, UserCheck } from 'lucide-react'

interface Props {
  owner: {
    id: string
    fullName: string
    documentId: string
    phone: string | null
    email: string | null
  }
  vehicleId?: string
}

export function EditOwnerModal({ owner, vehicleId }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const [state, action, pending] = useActionState(
    async (_prev: OwnerFormState | null, formData: FormData) => {
      formData.set('id', owner.id)
      const result = await updateOwnerAction(_prev, formData)
      if (result.success) {
        router.refresh()
        setOpen(false)
      }
      return result
    },
    null,
  )

  const [reassignState, reassignAction, reassignPending] = useActionState(
    async (_prev: OwnerFormState | null, formData: FormData) => {
      const result = await reassignVehicleToOwnerAction(_prev, formData)
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
          <DialogTitle>Editar Propietario</DialogTitle>
          <DialogClose onClick={() => setOpen(false)} />
        </DialogHeader>

        <form action={action}>
          <DialogContent>
            {state?.error && !state?.duplicate && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            {state?.duplicate && state?.existingOwnerId && (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                <AlertDescription className="text-amber-800 dark:text-amber-300">
                  Ya existe un propietario con ese documento:{' '}
                  <strong>{state.existingOwnerName}</strong>
                  {vehicleId && (
                    <>
                      <br />
                      ¿Desea reasignar este vehículo a ese propietario?
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {state?.success && (
              <Alert variant="success">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>Propietario actualizado correctamente</AlertDescription>
              </Alert>
            )}

            {reassignState?.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{reassignState.error}</AlertDescription>
              </Alert>
            )}

            {reassignState?.success && (
              <Alert variant="success">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>Vehículo reasignado correctamente</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName" required>Nombre Completo</Label>
              <Input
                id="fullName"
                name="fullName"
                defaultValue={owner.fullName}
                placeholder="Nombre y apellido"
                disabled={pending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentId">Documento</Label>
              <Input
                id="documentId"
                name="documentId"
                defaultValue={owner.documentId}
                placeholder="V-123456789"
                disabled={pending}
              />
              <p className="text-xs text-muted-foreground">Formato: V-123456789, E-123456789, J-123456789</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={owner.phone ?? ''}
                  placeholder="0414-1234567"
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={owner.email ?? ''}
                  placeholder="correo@ejemplo.com"
                  disabled={pending}
                />
              </div>
            </div>
          </DialogContent>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>

            {state?.duplicate && state?.existingOwnerId && vehicleId ? (
              <form action={reassignAction} className="inline">
                <input type="hidden" name="vehicleId" value={vehicleId} />
                <input type="hidden" name="newOwnerId" value={state.existingOwnerId} />
                <input type="hidden" name="oldOwnerId" value={owner.id} />
                <Button type="submit" disabled={reassignPending} variant="default" className="gap-2">
                  <UserCheck className="w-4 h-4" />
                  {reassignPending ? 'Reasignando...' : 'Reasignar a este propietario'}
                </Button>
              </form>
            ) : (
              <Button type="submit" disabled={pending}>
                {pending ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </Dialog>
    </>
  )
}
