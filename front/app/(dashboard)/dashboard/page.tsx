import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { RecentInspectionsList } from '@/components/dashboard/recent-inspections-list'
import { PendingAlerts } from '@/components/dashboard/pending-alerts'
import {
  countInspectionsByStatus,
  countInspectionsToday,
  getRecentInspectionsWithOwner,
} from '@/lib/services/inspection'
import { getPendingAlerts } from '@/lib/services/inspection-pending'
import { countVehicles } from '@/lib/services/vehicle'

const quickActions = [
  { href: '/inspections/new', title: 'Nuevo Ingreso Rápido', desc: 'Ingreso unificado (montados/desmontados)', icon: 'zap', color: 'from-amber-500 to-orange-600', featured: true },
  { href: '/owners/new', title: 'Nuevo Dueño', desc: 'Registrar titular de vehículo', icon: 'user-plus', color: 'from-green-500 to-green-600' },
  { href: '/vehicles/new', title: 'Nuevo Vehículo', desc: 'Registrar vehículo para inspección', icon: 'truck', color: 'from-emerald-500 to-emerald-600' },
  { href: '/inspections', title: 'Ver Inspecciones', desc: 'Listado completo de inspecciones', icon: 'clipboard-check', color: 'from-violet-500 to-violet-600' },
]

function Icon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    'user-plus': (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    truck: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
    'clipboard-check': (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    zap: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    arrow: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    ),
  }
  return <>{icons[name] || null}</>
}

export default async function DashboardPage() {
  let statusCounts = { inspeccion_inicial: 0, recalificacion: 0, por_programar: 0, certificado: 0 }
  let todayCount = 0
  let vehicleCount = 0
  let recentInspections: Awaited<ReturnType<typeof getRecentInspectionsWithOwner>> = []
  let pendingAlerts: Awaited<ReturnType<typeof getPendingAlerts>> = []

  try {
    const [sc, tc, vc, ri, pa] = await Promise.allSettled([
      countInspectionsByStatus(),
      countInspectionsToday(),
      countVehicles(),
      getRecentInspectionsWithOwner(5),
      getPendingAlerts(10),
    ])

    if (sc.status === 'fulfilled') statusCounts = sc.value
    if (tc.status === 'fulfilled') todayCount = tc.value
    if (vc.status === 'fulfilled') vehicleCount = vc.value
    if (ri.status === 'fulfilled') recentInspections = ri.value
    if (pa.status === 'fulfilled') pendingAlerts = pa.value
  } catch {
    // All sections fall back to zeros/empty — page stays alive
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-base">Resumen general del sistema de inspección GNC</p>
      </div>

      {/* Stats Grid */}
      <DashboardStats
        statusCounts={statusCounts}
        todayCount={todayCount}
        vehicleCount={vehicleCount}
      />

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}
              className={`group block ${action.featured ? 'md:col-span-3' : ''}`}>
              <Card className={`hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-gradient-to-br from-secondary/50 to-secondary group-hover:from-primary/5 group-hover:to-primary/10 ${
                action.featured ? 'ring-2 ring-amber-400 dark:ring-amber-600' : ''
              }`}>
                <CardContent className={`${action.featured ? 'p-6' : 'p-5'}`}>
                  <div className="flex items-start justify-between">
                    <div className={`${action.featured ? 'w-14 h-14' : 'w-12 h-12'} rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-sm`}>
                      <Icon name={action.icon} className={action.featured ? 'w-7 h-7' : 'w-6 h-6'} />
                    </div>
                    <div className="text-muted-foreground group-hover:text-primary transition-colors">
                      <Icon name="arrow" className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className={`${action.featured ? 'text-xl' : 'text-lg'} font-semibold text-foreground`}>
                      {action.title}
                      {action.featured && (
                        <span className="ml-2 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-normal">
                          NUEVO
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{action.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Pending Alerts */}
      <div>
        <PendingAlerts alerts={pendingAlerts} />
      </div>

      {/* Recent Inspections */}
      <div>
        <RecentInspectionsList inspections={recentInspections} />
      </div>
    </div>
  )
}
