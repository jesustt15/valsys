'use client'

import { useState, useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateInspectionAction, type UpdateInspectionState } from '@/lib/actions/inspection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Edit2, AlertCircle } from 'lucide-react'

interface Props {
  inspectionId: string
  kmCurrent: number | null
  observations: string | null
}

export function EditInspectionFields({ inspectionId, kmCurrent, observations }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  const [state, formAction, pending] = useActionState<UpdateInspectionState | null, FormData>(
    updateInspectionAction,
    null,
  )

  useEffect(() => {
    if (state?.success) {
      router.refresh()
      setOpen(false)
    }
  }, [state?.success, router])

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Edit2 className="w-4 h-4 mr-1" />
        Editar
      </Button>
    )
  }

  return (
    <form action={formAction} className="bg-muted/30 p-4 rounded-xl border border-border space-y-4">
      <h4 className="font-medium text-sm">Editar Datos de Inspección</h4>
      <input type="hidden" name="id" value={inspectionId} />

      <div className="space-y-2">
        <Label htmlFor="kmCurrent">Kilómetros actuales</Label>
        <Input
          id="kmCurrent"
          name="kmCurrent"
          type="number"
          min={1}
          defaultValue={kmCurrent ?? ''}
          disabled={pending}
          placeholder="Ej: 45000"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="observations">Observaciones</Label>
        <Textarea
          id="observations"
          name="observations"
          rows={3}
          defaultValue={observations ?? ''}
          disabled={pending}
          placeholder="Notas adicionales..."
        />
      </div>

      {state?.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </form>
  )
}
