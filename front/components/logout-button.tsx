'use client'

import { useRouter } from 'next/navigation'
import { logoutAction } from '@/lib/actions/auth'
import { LogOut } from 'lucide-react'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await logoutAction()
    router.push('/')
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
    >
      <LogOut className="w-4 h-4" />
      Cerrar Sesión
    </button>
  )
}
