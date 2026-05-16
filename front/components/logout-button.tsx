'use client'

import { useRouter } from 'next/navigation'
import { logoutAction } from '@/lib/actions/auth'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await logoutAction()
    router.push('/')
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
    >
      Cerrar Sesión
    </button>
  )
}
