import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getOwnerById } from '@/lib/services/owner'
import { getVehiclesByOwnerId } from '@/lib/services/vehicle'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { User, Truck, Phone, Mail, FileText, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function OwnerDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const owner = await getOwnerById(resolvedParams.id)

  if (!owner) {
    notFound()
  }

  const vehicles = await getVehiclesByOwnerId(owner.id)

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <nav>
        <ol className="flex items-center gap-2 text-sm text-gray-500">
          <li><Link href="/dashboard" className="hover:text-gray-700 transition-colors">Inicio</Link></li>
          <li>/</li>
          <li><Link href="/owners" className="hover:text-gray-700 transition-colors">Propietarios</Link></li>
          <li>/</li>
          <li className="text-gray-900 font-medium truncate max-w-[200px]">{owner.fullName}</li>
        </ol>
      </nav>

      <div>
        <h1 className="text-3xl font-bold text-foreground">Perfil del Propietario</h1>
        <p className="text-muted-foreground mt-1 text-sm">Administración y seguimiento de la flota</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Owner Info Card */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-border pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
                <User className="w-10 h-10" />
              </div>
            </div>
            <CardTitle className="text-xl text-center">{owner.fullName}</CardTitle>
            <CardDescription className="text-center mt-1">
              Titular
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4 text-sm">
            <div className="flex items-center gap-3 text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>{owner.documentId}</span>
            </div>
            {owner.phone && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>{owner.phone}</span>
              </div>
            )}
            {owner.email && (
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>{owner.email}</span>
              </div>
            )}

            <div className="flex items-center gap-3 text-muted-foreground border-t border-border pt-4 mt-2">
              <Calendar className="w-4 h-4" />
              <span>Registrado: {owner.createdAt?.toLocaleDateString('es-AR') ?? '—'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Vehicles List */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-500" />
                Vehículos Registrados
                <Badge variant="secondary" className="ml-auto">{vehicles.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vehicles.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-xl text-muted-foreground">
                  No tiene vehículos registrados.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {vehicles.map((v) => (
                    <Link key={v.id} href={`/vehicles/${v.id}`} className="group">
                      <div className="p-4 rounded-xl border border-border bg-card hover:bg-muted/30 hover:border-emerald-200 transition-all shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-mono text-lg font-bold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                            {v.licensePlate}
                          </span>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                            {v.year || '—'}
                          </span>
                        </div>
                        <div className="text-sm font-medium">
                          {v.brand || 'Marca no registrada'} {v.model ? `— ${v.model}` : ''}
                        </div>
                        {v.vin && (
                          <div className="text-xs text-muted-foreground mt-2 font-mono">
                            VIN: {v.vin}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
