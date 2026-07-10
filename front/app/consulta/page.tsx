'use client'

import { useActionState } from 'react'
import { motion } from 'framer-motion'
import { Search, ShieldCheck } from 'lucide-react'
import Image from 'next/image'
import { LogoContainer } from '@/components/logo-container'
import { searchAction } from '@/lib/actions/search'

export default function ConsultaPage() {
  const [state, formAction, pending] = useActionState(searchAction, null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-green-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
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
            Ingrese una placa o número correlativo para consultar
          </p>
        </div>

        {/* Search Form */}
        <form action={formAction} className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              name="query"
              defaultValue={state?.query ?? ''}
              placeholder="Patente o correlativo"
              className="w-full h-14 pl-12 pr-4 rounded-xl border border-border bg-white dark:bg-card text-lg font-mono font-bold tracking-widest text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              autoFocus
            />
          </div>

          {state?.error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-500 text-center"
            >
              {state.error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full h-14 rounded-xl bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="w-5 h-5" />
            {pending ? 'Buscando…' : 'Consultar'}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-8">
          <LogoContainer src="/logo/logoagrogas.png" alt="Valsys" width={110} height={32} size="md" className="opacity-80" />
          <p className="text-xs text-muted-foreground mt-2">
            Sistema de Gestión de Certificados GNC — Valsys
          </p>
        </div>
      </motion.div>
    </div>
  )
}
