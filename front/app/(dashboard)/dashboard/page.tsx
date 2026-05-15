import Link from 'next/link'

export default function DashboardPage() {
  const stats = [
    { label: 'Inspecciones Hoy', value: '12', color: 'text-blue-600', icon: '📋' },
    { label: 'Pendientes', value: '5', color: 'text-amber-600', icon: '⏳' },
    { label: 'Finalizadas', value: '7', color: 'text-green-600', icon: '✅' },
    { label: 'Vehículos', value: '143', color: 'text-purple-600', icon: '🚐' },
  ]

  const recentInspections = [
    { plate: 'ABC-123', owner: 'Juan Pérez', status: 'finalizado', time: 'Hace 5 min' },
    { plate: 'DEF-456', owner: 'María López', status: 'en_planta', time: 'Hace 30 min' },
    { plate: 'GHI-789', owner: 'Carlos Ruiz', status: 'inspeccion_inicial', time: 'Hace 1 hora' },
    { plate: 'JKL-012', owner: 'Ana García', status: 'finalizado', time: 'Hace 2 horas' },
    { plate: 'MNO-345', owner: 'Pedro Díaz', status: 'inspeccion_inicial', time: 'Hace 3 horas' },
  ]

  const statusColors: Record<string, string> = {
    finalizado: 'bg-green-100 text-green-700',
    en_planta: 'bg-amber-100 text-amber-700',
    inspeccion_inicial: 'bg-blue-100 text-blue-700',
  }

  const statusLabels: Record<string, string> = {
    finalizado: 'Finalizado',
    en_planta: 'En Planta',
    inspeccion_inicial: 'Inspección Inicial',
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen general del sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/owners/new" className="bg-white border border-border rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="text-lg font-semibold text-foreground">+ Nuevo Dueño</div>
          <p className="text-sm text-muted-foreground mt-1">Registrar titular de vehículo</p>
        </Link>
        <Link href="/vehicles/new" className="bg-white border border-border rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="text-lg font-semibold text-foreground">+ Nuevo Vehículo</div>
          <p className="text-sm text-muted-foreground mt-1">Registrar vehículo para inspección</p>
        </Link>
        <Link href="/inspections/new" className="bg-white border border-border rounded-lg p-5 hover:border-blue-300 hover:shadow-sm transition-all">
          <div className="text-lg font-semibold text-foreground">+ Nueva Inspección</div>
          <p className="text-sm text-muted-foreground mt-1">Iniciar proceso de inspección</p>
        </Link>
      </div>

      {/* Inspecciones recientes */}
      <div className="bg-white border border-border rounded-lg">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Inspecciones Recientes</h2>
        </div>
        <div className="divide-y divide-border">
          {recentInspections.map((insp, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-sm font-mono font-bold text-blue-600">
                  {insp.plate.slice(-3)}
                </div>
                <div>
                  <p className="font-medium text-foreground font-mono">{insp.plate}</p>
                  <p className="text-sm text-muted-foreground">{insp.owner}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[insp.status]}`}>
                  {statusLabels[insp.status]}
                </span>
                <span className="text-sm text-muted-foreground">{insp.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
