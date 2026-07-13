import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getUnreadCount } from '@/lib/services/notification'
import { AdminLayoutClient } from './layout-client'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session || session.role !== 'admin') {
    redirect('/dashboard')
  }

  const initialUnreadCount = await getUnreadCount(session.sub)

  return (
    <AdminLayoutClient
      fullName={session.fullName}
      role={session.role}
      initialUnreadCount={initialUnreadCount}
    >
      {children}
    </AdminLayoutClient>
  )
}
