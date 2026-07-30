'use client'

import { useActionState } from 'react'
import { deleteInspectionAction, restoreInspectionAction } from '@/lib/actions/inspection'
import { Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DeleteInspectionButtonProps {
  inspectionId: string
  source?: 'gnc' | 'utp'
}

export function DeleteInspectionButton({ inspectionId, source = 'gnc' }: DeleteInspectionButtonProps) {
  const [state, formAction, isPending] = useActionState(deleteInspectionAction, null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm('¿Ocultar esta inspección? No se eliminará de la base de datos, solo se ocultará de la lista.')) {
      e.preventDefault()
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="inline">
      <input type="hidden" name="id" value={inspectionId} />
      <input type="hidden" name="source" value={source} />
      {state?.error && (
        <span className="text-xs text-destructive mr-2">{state.error}</span>
      )}
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        disabled={isPending}
        className="h-9 w-9 text-destructive hover:bg-destructive/10"
        title="Ocultar inspección"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </form>
  )
}

export function RestoreInspectionButton({ inspectionId, source = 'gnc' }: DeleteInspectionButtonProps) {
  const [state, formAction, isPending] = useActionState(restoreInspectionAction, null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm('¿Restaurar esta inspección? Volverá a aparecer en la lista.')) {
      e.preventDefault()
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="inline">
      <input type="hidden" name="id" value={inspectionId} />
      <input type="hidden" name="source" value={source} />
      {state?.error && (
        <span className="text-xs text-destructive mr-2">{state.error}</span>
      )}
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        disabled={isPending}
        className="h-9 w-9 text-amber-600 hover:bg-amber-50"
        title="Restaurar inspección"
      >
        <Undo2 className="w-4 h-4" />
      </Button>
    </form>
  )
}
