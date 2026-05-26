import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { ChangePasswordForm } from '@/components/forms/change-password-form'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session || (session.role !== 'operator' && session.role !== 'admin')) {
    redirect('/dashboard')
  }

  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-1">Configuración</h1>
      <p className="text-muted-foreground mb-8">
        Cambiá tu contraseña de acceso al sistema
      </p>
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <ChangePasswordForm />
      </div>
    </div>
  )
}
