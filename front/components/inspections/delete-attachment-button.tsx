'use client'

import { useState, useActionState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteInspectionAttachmentAction, type DeleteAttachmentState } from '@/lib/actions/inspection'

interface DeleteAttachmentButtonProps {
  attachmentId: string
}

export function DeleteAttachmentButton({ attachmentId }: DeleteAttachmentButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [state, formAction, pending] = useActionState<DeleteAttachmentState | null, FormData>(
    deleteInspectionAttachmentAction,
    null,
  )

  const handleClick = () => {
    if (confirming) return
    setConfirming(true)
  }

  const handleCancel = () => {
    setConfirming(false)
  }

  if (pending) {
    return (
      <div className="absolute top-2 right-2 z-10">
        <div className="w-7 h-7 rounded-full bg-white/90 dark:bg-card/90 shadow flex items-center justify-center">
          <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
        </div>
      </div>
    )
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-white/90 dark:bg-card/90 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 dark:hover:bg-red-950/50"
        title="Eliminar archivo"
      >
        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-600" />
      </button>
    )
  }

  return (
    <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
      <form action={formAction}>
        <input type="hidden" name="attachmentId" value={attachmentId} />
        <button
          type="submit"
          className="w-7 h-7 rounded-full bg-red-600 shadow flex items-center justify-center hover:bg-red-700 transition-colors"
          title="Confirmar eliminación"
        >
          <Trash2 className="w-3.5 h-3.5 text-white" />
        </button>
      </form>
      <button
        type="button"
        onClick={handleCancel}
        className="w-7 h-7 rounded-full bg-white/90 dark:bg-card/90 shadow flex items-center justify-center hover:bg-secondary transition-colors text-xs font-bold"
        title="Cancelar"
      >
        ✕
      </button>
    </div>
  )
}
