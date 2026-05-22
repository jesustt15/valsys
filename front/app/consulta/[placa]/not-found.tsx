import Link from 'next/link'
import { ArrowLeft, SearchX } from 'lucide-react'

export default function ConsultaNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-900/20 mb-4">
          <SearchX className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Vehículo no encontrado</h1>
        <p className="text-muted-foreground mb-6">
          No se encontró ningún vehículo con esa patente en el sistema.
          Verifique el número ingresado e intente nuevamente.
        </p>
        <Link
          href="/consulta"
          className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Nueva consulta
        </Link>
      </div>
    </div>
  )
}
