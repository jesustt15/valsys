'use client'

import { useActionState } from 'react'
import { deleteUserAction } from '@/lib/actions/user'

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
        <span className="text-xs text-red-600 mr-2">{state.error}</span>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Eliminando...' : 'Eliminar'}
      </button>
    </form>
  )
}
