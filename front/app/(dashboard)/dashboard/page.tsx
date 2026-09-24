import Link from 'next/link'
import {
  Plus,
  Shield,
  UserPlus,
  Car,
  ClipboardCheck,
  ClipboardList,
} from 'lucide-react'
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
import { countUtpInspectionsByStatus } from '@/lib/services/utp'
import { countVehicles } from '@/lib/services/vehicle'

const quickActions = [
  { href: '/inspections/new', label: 'Nueva GNC', icon: Plus, color: 'text-primary' as const },
  { href: '/utp/new', label: 'Nueva UTP', icon: Shield, color: 'text-status-info' as const },
  { href: '/owners/new', label: 'Nuevo Dueño', icon: UserPlus, color: 'text-status-success' as const },
  { href: '/vehicles/new', label: 'Nuevo Vehículo', icon: Car, color: 'text-status-warning' as const },
  { href: '/inspections', label: 'Ver Todas', icon: ClipboardCheck, color: 'text-primary' as const },
]

export default async function DashboardPage() {
  let statusCounts = { inspeccion_inicial: 0, recalificacion: 0, por_programar: 0, cita: 0, certificado: 0, standby: 0 }
  let todayCount = 0
  let vehicleCount = 0
  let utpCounts = { total: 0, inspeccion_inicial: 0, standby: 0, certificado: 0 }
  let recentInspections: Awaited<ReturnType<typeof getRecentInspectionsWithOwner>> = []
  let pendingAlerts: Awaited<ReturnType<typeof getPendingAlerts>> = []

  try {
    const [sc, tc, vc, uc, ri, pa] = await Promise.allSettled([
      countInspectionsByStatus(),
      countInspectionsToday(),
      countVehicles(),
      countUtpInspectionsByStatus(),
      getRecentInspectionsWithOwner(5),
      getPendingAlerts(10),
    ])

    if (sc.status === 'fulfilled') statusCounts = sc.value
    if (tc.status === 'fulfilled') todayCount = tc.value
    if (vc.status === 'fulfilled') vehicleCount = vc.value
    if (uc.status === 'fulfilled') utpCounts = uc.value
    if (ri.status === 'fulfilled') recentInspections = ri.value
    if (pa.status === 'fulfilled') pendingAlerts = pa.value
  } catch {
    // All sections fall back to zeros/empty — page stays alive
  }

  const totalInspections = Object.values(statusCounts).reduce((sum, v) => sum + v, 0)
  const isEmpty = totalInspections === 0 && vehicleCount === 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            En línea
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-headline font-bold text-foreground">Inicio</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">Resumen operativo GNC en tiempo real</p>
      </div>

      {/* Primary CTAs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link
          href="/inspections/new"
          className="inline-flex items-center justify-center gap-2 w-full min-h-[52px] rounded-xl bg-primary text-primary-foreground font-headline text-base font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
        >
          <Plus className="w-5 h-5" />
          Crear Inspección Normal
        </Link>
        <Link
          href="/utp/new"
          className="inline-flex items-center justify-center gap-2 w-full min-h-[52px] rounded-xl bg-status-info text-white font-headline text-base font-semibold hover:bg-status-info/90 active:scale-[0.98] transition-all"
        >
          <Shield className="w-5 h-5" />
          Crear Inspección UTP
        </Link>
      </div>

      {/* Empty State */}
      {isEmpty && (
        <Card className="border-2 border-dashed border-border bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-10 md:py-14 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <ClipboardList className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">No hay inspecciones aún</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Comienza registrando tu primera inspección de vehículo GNC para ver el resumen del sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <DashboardStats
        statusCounts={statusCounts}
        todayCount={todayCount}
        vehicleCount={vehicleCount}
        utpCounts={utpCounts}
      />

      {/* Quick Actions — Compact Pills */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-2">Acciones Rápidas</h2>
        <div className="grid grid-cols-3 gap-2">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className="h-20 rounded-xl bg-card border border-border hover:bg-muted active:scale-95 transition-all p-2 flex flex-col items-center justify-center gap-1 text-center"
              >
                <Icon className={`w-6 h-6 ${action.color}`} />
                <span className="text-xs font-semibold text-foreground leading-tight">{action.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Pending Alerts */}
      <PendingAlerts alerts={pendingAlerts} />

      {/* Recent Inspections */}
      <RecentInspectionsList inspections={recentInspections} />
    </div>
  )
}
