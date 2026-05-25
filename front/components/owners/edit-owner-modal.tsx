'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateOwnerAction, type OwnerFormState } from '@/lib/actions/owner'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle } from 'lucide-react'

interface Props {
  owner: {
    id: string
    fullName: string
    documentId: string
    phone: string | null
    email: string | null
  }
}

export function EditOwnerModal({ owner }: Props) {
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
            {state?.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}

            {state?.success && (
              <Alert variant="success">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>Propietario actualizado correctamente</AlertDescription>
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
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  )
}
