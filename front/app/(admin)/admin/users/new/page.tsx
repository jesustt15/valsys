import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { UserForm } from '@/components/forms/user-form'

export default async function NewUserPage() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nuevo usuario</h1>
      <UserForm mode="create" />
    </div>
  )
}
