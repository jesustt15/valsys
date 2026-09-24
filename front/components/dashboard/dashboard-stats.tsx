'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { ClipboardPlus, Clock, BadgeCheck, Car } from 'lucide-react'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

// Accent palette using project tokens
type Accent = 'primary' | 'status-warning' | 'status-info' | 'status-success'
const accentText: Record<Accent, string> = {
  primary: 'text-primary',
  'status-warning': 'text-status-warning',
  'status-info': 'text-status-info',
  'status-success': 'text-status-success',
}
const accentBg: Record<Accent, string> = {
  primary: 'bg-primary/10',
  'status-warning': 'bg-status-warning/10',
  'status-info': 'bg-status-info/10',
  'status-success': 'bg-status-success/10',
}

interface HeroKpi {
  label: string
  value: number
  micro: string
  accent: Accent
  icon: LucideIcon
  href: string
}

interface ChipData {
  label: string
  value: number
  href: string
}

const KPI_CARD_HEIGHT = 'h-[126px]'

function ChipSection({ title, chips }: { title: string; chips: ChipData[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="grid grid-cols-4 gap-2">
        {chips.map((chip) => (
          <Link
            key={chip.label}
            href={chip.href}
            className="rounded-lg bg-muted px-2 py-2 flex flex-col items-center text-center hover:bg-secondary transition-colors"
          >
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground leading-tight">{chip.label}</span>
            <span className="font-mono text-xl font-semibold text-foreground mt-0.5">{chip.value}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

interface DashboardStatsProps {
  statusCounts: {
    inspeccion_inicial: number
    recalificacion: number
    por_programar: number
    cita: number
    certificado: number
    standby: number
  }
  todayCount: number
  vehicleCount: number
  utpCounts: {
    total: number
    inspeccion_inicial: number
    standby: number
    certificado: number
  }
}

export function DashboardStats({ statusCounts, todayCount, vehicleCount, utpCounts }: DashboardStatsProps) {
  // Combine GNC + UTP certified counts
  const totalCertified = statusCounts.certificado + utpCounts.certificado
  // Pending = inspeccion_inicial + recalificacion + cita + standby (GNC) + inspeccion_inicial + standby (UTP)
  const totalPending = statusCounts.inspeccion_inicial + statusCounts.recalificacion + statusCounts.cita + statusCounts.standby + utpCounts.inspeccion_inicial + utpCounts.standby
  
  const heroKpis: HeroKpi[] = [
    {
      label: 'Certificadas',
      value: totalCertified,
      micro: 'GNC + UTP',
      accent: 'status-success',
      icon: BadgeCheck,
      href: '/certified',
    },
    {
      label: 'Pendientes',
      value: totalPending,
      micro: 'En proceso',
      accent: 'primary',
      icon: ClipboardPlus,
      href: '/inspections?status=pending',
    },
    {
      label: 'Por Programar',
      value: statusCounts.por_programar,
      micro: 'Requiere asignación',
      accent: 'status-warning',
      icon: Clock,
      href: '/inspections?status=por_programar',
    },
  ]

  const gncChips: ChipData[] = [
    { label: 'Hoy', value: todayCount, href: '/inspections' },
    { label: 'Recalificación', value: statusCounts.recalificacion, href: '/inspections?status=recalificacion' },
    { label: 'Cita', value: statusCounts.cita, href: '/inspections?status=cita' },
    { label: 'Standby', value: statusCounts.standby, href: '/inspections?status=standby' },
  ]

  const utpChips: ChipData[] = [
    { label: 'Total UTP', value: utpCounts.total, href: '/utp' },
    { label: 'Inicial', value: utpCounts.inspeccion_inicial, href: '/utp?status=inspeccion_inicial' },
    { label: 'Standby', value: utpCounts.standby, href: '/utp?status=standby' },
    { label: 'Certificadas', value: utpCounts.certificado, href: '/utp?status=certificado' },
  ]

  return (
    <div className="space-y-4">
      {/* Hero KPIs - 3 main cards */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {heroKpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <motion.div key={kpi.label} variants={item}>
              <Link
                href={kpi.href}
                className={`${KPI_CARD_HEIGHT} rounded-xl bg-card border border-border p-4 flex flex-col justify-between hover:bg-muted transition-colors block`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground font-medium">{kpi.label}</span>
                  <div className={`w-10 h-10 rounded-lg ${accentBg[kpi.accent]} flex items-center justify-center ${accentText[kpi.accent]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <span className={`font-mono text-4xl font-bold leading-none tracking-tight ${accentText[kpi.accent]} block`}>
                    {kpi.value}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1 block">{kpi.micro}</span>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Secondary chips — GNC */}
      <ChipSection title="Más métricas · GNC" chips={gncChips} />

      {/* Secondary chips — UTP */}
      <ChipSection title="UTP" chips={utpChips} />
    </div>
  )
}

/**
 * Skeleton placeholder for DashboardStats — 4 hero cards + chip rows.
 */
export function DashboardStatsSkeleton() {
  return (
    <div className="space-y-4" aria-label="Cargando estadísticas..." role="status">
      {/* Hero skeletons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${KPI_CARD_HEIGHT} rounded-xl bg-card border border-border p-4 animate-pulse flex flex-col justify-between`}>
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-muted rounded" />
              <div className="w-8 h-8 rounded-lg bg-muted" />
            </div>
            <div>
              <div className="h-8 w-14 bg-muted rounded mb-1" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
      {/* Chip skeletons */}
      <div className="space-y-2">
        <div className="h-3 w-32 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-muted h-16 animate-pulse" />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-16 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-muted h-16 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
