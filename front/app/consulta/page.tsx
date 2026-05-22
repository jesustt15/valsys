'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, ShieldCheck } from 'lucide-react'

export default function ConsultaPage() {
  const [plate, setPlate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = plate.trim().toUpperCase()

    if (!trimmed) {
      setError('Ingrese una patente para consultar')
      return
    }

    if (trimmed.length < 3) {
      setError('La patente debe tener al menos 3 caracteres')
      return
    }

    setError(null)
    router.push(`/consulta/${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Consulta de Certificados</h1>
          <p className="text-muted-foreground mt-2">
            Ingrese la patente del vehículo para consultar su certificado GNC
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={plate}
              onChange={(e) => {
                setPlate(e.target.value.toUpperCase())
                setError(null)
              }}
              placeholder="Ej: ABC123"
              maxLength={10}
              className="w-full h-14 pl-12 pr-4 rounded-xl border border-border bg-white dark:bg-card text-lg font-mono font-bold tracking-widest text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              autoFocus
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-500 text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Search className="w-5 h-5" />
            Consultar
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Sistema de Gestión de Certificados GNC — Valsys
        </p>
      </motion.div>
    </div>
  )
}
