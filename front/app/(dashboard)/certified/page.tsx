import Link from 'next/link'
import { getAllInspections } from '@/lib/services/inspection'
import { getUtpInspections } from '@/lib/services/utp'
import { getSession } from '@/lib/auth/get-session'
import { CertifiedTable } from './certified-table'

export default async function CertifiedPage() {
  const session = await getSession()
  
  // Fetch both GNC and UTP certified inspections
  const [gncInspections, utpInspections] = await Promise.all([
    getAllInspections(),
    getUtpInspections(),
  ])

  // Filter only certified inspections
  const certifiedGnc = gncInspections.filter((i) => i.status === 'certificado')
  const certifiedUtp = utpInspections.filter((i) => i.status === 'certificado')

  // Combine both lists with a type identifier
  const allCertified = [
    ...certifiedGnc.map((i) => ({ 
      ...i, 
      type: 'GNC' as const,
      createdAt: i.inspectionDate, // Use inspectionDate as fallback
    })),
    ...certifiedUtp.map((i) => ({ 
      ...i, 
      type: 'UTP' as const,
      createdAt: i.inspectionDate,
      brand: null, // UTP doesn't have brand
      model: null, // UTP doesn't have model
    })),
  ].sort((a, b) => {
    // Sort by creation date descending
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return dateB - dateA
  })

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav>
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Inicio
            </Link>
          </li>
          <li className="text-muted-foreground">/</li>
          <li className="font-medium text-foreground">Certificadas</li>
        </ol>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inspecciones Certificadas</h1>
        <p className="text-muted-foreground mt-1">Listado de todas las inspecciones certificadas (GNC + UTP)</p>
      </div>

      {/* Card wrapper */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {allCertified.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No hay inspecciones certificadas aún</p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/inspections/new"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                           text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
              >
                Crear Inspección GNC
              </Link>
              <Link
                href="/utp/new"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                           text-white bg-status-info rounded-lg hover:bg-status-info/90 transition-colors"
              >
                Crear Inspección UTP
              </Link>
            </div>
          </div>
        ) : (
          <CertifiedTable
            inspections={allCertified}
            canDelete={session?.role === 'admin' || session?.role === 'operator'}
          />
        )}
      </div>
    </div>
  )
}
