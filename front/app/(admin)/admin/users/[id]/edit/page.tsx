import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getUserById } from '@/lib/services/user'
import { UserForm } from '@/components/forms/user-form'

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    redirect('/dashboard')
  }

  const { id } = await params
  const user = await getUserById(id)

  if (!user) {
    redirect('/admin/users')
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Editar usuario</h1>
      <UserForm mode="edit" user={user} />
    </div>
  )
}
