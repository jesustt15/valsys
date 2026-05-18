import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'

export default async function AdminPage() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    redirect('/dashboard')
  }
  redirect('/admin/users')
}
