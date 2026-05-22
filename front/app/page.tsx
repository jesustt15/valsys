'use client'

import { useEffect } from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { loginAction } from '@/lib/actions/auth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Shield, Zap, CheckCircle, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(loginAction, null)

  useEffect(() => {
    if (state && 'success' in state) {
      router.push('/dashboard')
    }
  }, [state, router])

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 flex-col justify-between p-12 text-white relative overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center gap-3 mb-2"
          >
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-blue-600 font-bold text-xl">V</span>
            </div>
            <span className="text-3xl font-bold">ValSys</span>
          </motion.div>
          <p className="text-blue-100 text-base">Sistema de Inspección GNC</p>
        </div>

        <div className="space-y-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex items-center gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm"
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Inspecciones Precisas</h3>
              <p className="text-blue-100 text-sm">Registro completo y detallado de cada inspección</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex items-center gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm"
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Rápido y Eficiente</h3>
              <p className="text-blue-100 text-sm">Gestiona inspecciones en tiempo real</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex items-center gap-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm"
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Seguro y Confiable</h3>
              <p className="text-blue-100 text-sm">Datos protegidos y trazabilidad completa</p>
            </div>
          </motion.div>
        </div>

        <p className="text-blue-200 text-xs relative z-10">© 2026 ValSys. Todos los derechos reservados.</p>
      </motion.div>

      {/* Right side - Login Form */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 py-12"
      >
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:hidden mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">V</span>
              </div>
              <span className="text-2xl font-bold text-foreground">ValSys</span>
            </div>
            <p className="text-muted-foreground text-sm">Sistema de Inspección GNC</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-foreground mb-2">Bienvenido</h1>
            <p className="text-muted-foreground">Inicia sesión en tu cuenta para continuar</p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            action={formAction}
            className="space-y-5"
          >
            {state && 'error' in state && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3"
              >
                <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-800 dark:text-red-200 text-sm">{state.error}</span>
              </motion.div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
                Usuario
              </label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="tu-usuario"
                required
                className="h-12"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  Contraseña
                </label>
                <a href="#" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="h-12"
              />
            </div>

            <Button
              type="submit"
              disabled={isPending}
              size="lg"
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 active:scale-[0.98]"
            >
              {isPending ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Ingresando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  Iniciar Sesión
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </Button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 pt-6 border-t border-border"
          >
            <p className="text-center text-muted-foreground text-sm">
              ¿No tienes cuenta?{' '}
              <a href="#" className="font-medium text-primary hover:text-primary/80 transition-colors">
                Contacta al administrador
              </a>
            </p>
          </motion.div>

          {/* Footer Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8 grid grid-cols-3 gap-4"
          >
            <div className="text-center p-3 rounded-xl bg-secondary/50">
              <div className="text-2xl font-bold text-foreground">500+</div>
              <p className="text-xs text-muted-foreground mt-1">Inspecciones</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">98%</div>
              <p className="text-xs text-muted-foreground mt-1">Precisión</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">24/7</div>
              <p className="text-xs text-muted-foreground mt-1">Disponible</p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
