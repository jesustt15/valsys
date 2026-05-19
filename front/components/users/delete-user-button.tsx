'use client'

import { useActionState } from 'react'
import { deleteUserAction } from '@/lib/actions/user'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DeleteUserButtonProps {
  userId: string
}

export function DeleteUserButton({ userId }: DeleteUserButtonProps) {
  const [state, formAction, isPending] = useActionState(deleteUserAction, null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) {
      e.preventDefault()
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="inline">
      <input type="hidden" name="id" value={userId} />
      {state?.error && (
        <span className="text-xs text-destructive mr-2">{state.error}</span>
      )}
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        disabled={isPending}
        className="h-9 w-9 text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </form>
  )
}
