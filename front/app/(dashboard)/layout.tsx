import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getUnreadCount } from '@/lib/services/notification'
import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'
import { LogoutButton } from '@/components/logout-button'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect('/')
  }

  const initialUnreadCount = await getUnreadCount(session.sub)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role={session.role} />
      <div className="flex flex-col flex-1 ml-2">
        <Topbar
          fullName={session.fullName}
          role={session.role}
          logoutButton={<LogoutButton />}
          initialUnreadCount={initialUnreadCount}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
