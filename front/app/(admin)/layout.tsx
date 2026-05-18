import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'
import { LogoutButton } from '@/components/logout-button'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session || session.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar role={session.role} />
      <div className="flex flex-col flex-1 ml-2">
        <Topbar fullName={session.fullName} role={session.role} logoutButton={<LogoutButton />} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
