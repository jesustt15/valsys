import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { DashboardStats } from '@/components/dashboard/dashboard-stats'
import { RecentInspectionsList } from '@/components/dashboard/recent-inspections-list'
import {
  countInspectionsByStatus,
  countInspectionsToday,
  getRecentInspectionsWithOwner,
} from '@/lib/services/inspection'
import { countVehicles } from '@/lib/services/vehicle'

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

const quickActions = [
  { href: '/owners/new', title: 'Nuevo Due\xf1o', desc: 'Registrar titular de veh\xedculo', icon: 'user-plus', color: 'from-blue-500 to-blue-600' },
  { href: '/vehicles/new', title: 'Nuevo Veh\xedculo', desc: 'Registrar veh\xedculo para inspecci\xf3n', icon: 'truck', color: 'from-emerald-500 to-emerald-600' },
  { href: '/inspections/new', title: 'Nueva Inspecci\xf3n', desc: 'Iniciar proceso de inspecci\xf3n', icon: 'clipboard-check', color: 'from-violet-500 to-violet-600' },
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
    arrow: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
    ),
  }
  return <>{icons[name] || null}</>
}

export default async function DashboardPage() {
  let statusCounts = { inspeccion_inicial: 0, en_planta: 0, finalizado: 0 }
  let todayCount = 0
  let vehicleCount = 0
  let recentInspections: Awaited<ReturnType<typeof getRecentInspectionsWithOwner>> = []

  try {
    const [sc, tc, vc, ri] = await Promise.allSettled([
      countInspectionsByStatus(),
      countInspectionsToday(),
      countVehicles(),
      getRecentInspectionsWithOwner(5),
    ])

    if (sc.status === 'fulfilled') statusCounts = sc.value
    if (tc.status === 'fulfilled') todayCount = tc.value
    if (vc.status === 'fulfilled') vehicleCount = vc.value
    if (ri.status === 'fulfilled') recentInspections = ri.value
  } catch {
    // All sections fall back to zeros/empty — page stays alive
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0 },
        show: {
          opacity: 1,
          transition: { staggerChildren: 0.08, delayChildren: 0.1 },
        },
      }}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-base">Resumen general del sistema de inspecci\xf3n GNC</p>
      </motion.div>

      {/* Stats Grid */}
      <DashboardStats
        statusCounts={statusCounts}
        todayCount={todayCount}
        vehicleCount={vehicleCount}
      />

      {/* Quick Actions */}
      <motion.div variants={item}>
        <h2 className="text-lg font-semibold text-foreground mb-4">Acciones R\xe1pidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="group block">
              <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 bg-gradient-to-br from-secondary/50 to-secondary group-hover:from-primary/5 group-hover:to-primary/10">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-sm`}>
                      <Icon name={action.icon} className="w-6 h-6" />
                    </div>
                    <div className="text-muted-foreground group-hover:text-primary transition-colors">
                      <Icon name="arrow" className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-lg font-semibold text-foreground">{action.title}</div>
                    <p className="text-sm text-muted-foreground mt-1">{action.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Recent Inspections */}
      <motion.div variants={item}>
        <RecentInspectionsList inspections={recentInspections} />
      </motion.div>
    </motion.div>
  )
}
