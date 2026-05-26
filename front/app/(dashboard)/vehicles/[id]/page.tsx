import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getVehicleById } from '@/lib/services/vehicle'
import { getOwnerById } from '@/lib/services/owner'
import { getInspectionsByVehicleId } from '@/lib/services/inspection'
import { getCylindersByVehicleId } from '@/lib/services/cylinder'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Truck, User, Calendar, ClipboardCheck, Database, ArrowRight } from 'lucide-react'
import { EditVehicleModal } from '@/components/vehicles/edit-vehicle-modal'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VehicleDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  
  // We need to implement getVehicleById or use a query directly since it wasn't added explicitly
  // Wait, I will use db directly if it's not exported, or I'll implement it inline.
  // Actually, I'll implement it inline to be fast and safe.
  const { db } = await import('@/lib/db')
  const { vehicles } = await import('@/db/schema')
  const { eq } = await import('drizzle-orm')

  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, resolvedParams.id))

  if (!vehicle) {
    notFound()
  }

  const owner = vehicle.ownerId ? await getOwnerById(vehicle.ownerId) : null
  const inspections = await getInspectionsByVehicleId(vehicle.id)
  const cylinders = await getCylindersByVehicleId(vehicle.id)

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <nav>
        <ol className="flex items-center gap-2 text-sm">
          <li><Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">Inicio</Link></li>
          <li className="text-muted-foreground">/</li>
          <li><Link href="/vehicles" className="text-muted-foreground hover:text-foreground transition-colors">Vehículos</Link></li>
          <li className="text-muted-foreground">/</li>
          <li className="font-medium text-foreground font-mono truncate max-w-[200px]">{vehicle.licensePlate}</li>
        </ol>
      </nav>

      <div>
        <h1 className="text-3xl font-bold text-foreground">Perfil del Vehículo</h1>
        <p className="text-muted-foreground mt-1 text-sm font-mono">ID: {vehicle.id}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Vehicle & Owner Info */}
        <div className="space-y-6 md:col-span-1">
          <Card>
            <CardHeader className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-border pb-4">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
                  <Truck className="w-10 h-10" />
                </div>
              </div>
              <CardTitle className="text-2xl font-mono text-center tracking-wider">{vehicle.licensePlate}</CardTitle>
              <CardDescription className="text-center mt-1 font-medium text-foreground">
                {vehicle.brand} {vehicle.model}
              </CardDescription>
              <div className="flex justify-center mt-3">
                <EditVehicleModal vehicle={vehicle} />
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Año</span>
                <span className="font-medium">{vehicle.year || '—'}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">VIN</span>
                <span className="font-mono">{vehicle.vin || '—'}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-muted-foreground">Registro</span>
                <span>{vehicle.createdAt?.toLocaleDateString('es-AR') ?? '—'}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-500" />
                Titular Actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              {owner ? (
                <div className="space-y-2 text-sm">
                  <div className="font-medium">{owner.fullName}</div>
                  <div className="text-muted-foreground font-mono text-xs">{owner.documentId}</div>
                  <Link href={`/owners/${owner.id}`} className="text-indigo-600 hover:underline text-xs flex items-center mt-2">
                    Ver perfil <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Sin titular asignado</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Inspections & Cylinders */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-blue-500" />
                Historial de Inspecciones
                <Badge variant="secondary" className="ml-auto">{inspections.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {inspections.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-xl text-muted-foreground">
                  No hay inspecciones registradas para este vehículo.
                </div>
              ) : (
                <div className="space-y-3">
                  {inspections.map((insp) => (
                    <Link key={insp.id} href={`/inspections/${insp.id}`} className="block group">
                      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium text-sm group-hover:text-blue-600 transition-colors">
                              {insp.inspectionDate?.toLocaleDateString('es-AR') ?? 'Fecha desconocida'}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {insp.kmCurrent.toLocaleString('es-AR')} km
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={
                            insp.status === 'finalizado' ? 'success' : 
                            insp.status === 'en_planta' ? 'warning' : 'secondary'
                          }>
                            {(insp.status ?? 'inspeccion_inicial').replace('_', ' ').toUpperCase()}
                          </Badge>
                          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:text-blue-600" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-500" />
                Cilindros Actuales
                <Badge variant="secondary" className="ml-auto">{cylinders.length}</Badge>
              </CardTitle>
              <CardDescription>Cilindros registrados y vinculados en el sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {cylinders.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed rounded-xl text-muted-foreground text-sm">
                  Sin cilindros registrados
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Marca</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Capacidad</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Serie</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {cylinders.map((cyl) => (
                        <tr key={cyl.id} className="hover:bg-muted/10">
                          <td className="px-4 py-3 text-sm">{cyl.brand}</td>
                          <td className="px-4 py-3 text-sm">{cyl.capacity}</td>
                          <td className="px-4 py-3 text-sm font-mono">{cyl.actualSerial || cyl.initialSerial}</td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant={
                              cyl.status === 'montado' ? 'success' : 
                              cyl.status === 'en_planta' ? 'warning' : 
                              cyl.status === 'de_baja' ? 'destructive' : 'secondary'
                            }>
                              {cyl.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
      </div>
    </div>
  )
}
