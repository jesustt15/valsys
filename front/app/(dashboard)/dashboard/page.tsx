'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const statsData = [
  { label: 'Inspecciones Hoy', value: '12', trend: '+3', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: 'clipboard' },
  { label: 'Pendientes', value: '5', trend: '-2', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: 'clock' },
  { label: 'Finalizadas', value: '7', trend: '+5', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', icon: 'check' },
  { label: 'Vehículos', value: '143', trend: '+12', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', icon: 'truck' },
]

const quickActions = [
  { href: '/owners/new', title: 'Nuevo Dueño', desc: 'Registrar titular de vehículo', icon: 'user-plus', color: 'from-blue-500 to-blue-600' },
  { href: '/vehicles/new', title: 'Nuevo Vehículo', desc: 'Registrar vehículo para inspección', icon: 'truck', color: 'from-emerald-500 to-emerald-600' },
  { href: '/inspections/new', title: 'Nueva Inspección', desc: 'Iniciar proceso de inspección', icon: 'clipboard-check', color: 'from-violet-500 to-violet-600' },
]

const recentInspections = [
  { plate: 'ABC-123', owner: 'Juan Pérez', status: 'finalizado', time: 'Hace 5 min' },
  { plate: 'DEF-456', owner: 'María López', status: 'en_planta', time: 'Hace 30 min' },
  { plate: 'GHI-789', owner: 'Carlos Ruiz', status: 'inspeccion_inicial', time: 'Hace 1 hora' },
  { plate: 'JKL-012', owner: 'Ana García', status: 'finalizado', time: 'Hace 2 horas' },
  { plate: 'MNO-345', owner: 'Pedro Díaz', status: 'inspeccion_inicial', time: 'Hace 3 horas' },
]

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'info'; label: string }> = {
  finalizado: { variant: 'success', label: 'Finalizado' },
  en_planta: { variant: 'warning', label: 'En Planta' },
  inspeccion_inicial: { variant: 'info', label: 'Inspección Inicial' },
}

function Icon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  const icons: Record<string, React.ReactNode> = {
    clipboard: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    clock: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    check: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    truck: (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
    'user-plus': (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
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

export default function DashboardPage() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-base">Resumen general del sistema de inspección GNC</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat, i) => (
          <motion.div key={stat.label} variants={item}>
            <Card className="hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center ${stat.color}`}>
                    <Icon name={stat.icon} className="w-5 h-5" />
                  </div>
                  <Badge variant={stat.trend.startsWith('+') ? 'success' : 'destructive'} className="text-xs">
                    {stat.trend}
                  </Badge>
                </div>
                <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div variants={item}>
        <h2 className="text-lg font-semibold text-foreground mb-4">Acciones Rápidas</h2>
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
        <Card>
          <CardHeader>
            <CardTitle>Inspecciones Recientes</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-4">
            <div className="divide-y divide-border">
              {recentInspections.map((insp, i) => {
                const status = statusConfig[insp.status]
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="flex items-center justify-between py-3.5 hover:bg-secondary/30 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                        {insp.plate.slice(-3)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground font-mono">{insp.plate}</p>
                        <p className="text-sm text-muted-foreground">{insp.owner}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <span className="text-sm text-muted-foreground hidden sm:inline">{insp.time}</span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
