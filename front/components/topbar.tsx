'use client'

import { ReactNode } from 'react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Bell, User, Settings, LogOut, ChevronDown } from 'lucide-react'

interface TopbarProps {
  fullName: string
  role: string
  logoutButton: ReactNode
}

export function Topbar({ fullName, role, logoutButton }: TopbarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const roleLabel =
    role === 'admin'
      ? 'Administrador'
      : role === 'viewer'
        ? 'Visualizador'
        : 'Operador'

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border h-16 flex items-center px-6"
    >
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative p-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background" />
        </motion.button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-medium text-foreground">{fullName}</span>
              <span className="text-xs text-muted-foreground">{roleLabel}</span>
            </div>
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm">
              {initials}
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 hidden sm:block ${isOpen ? 'rotate-180' : ''}`} />
          </motion.button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {isOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 bg-popover border border-border rounded-xl shadow-xl py-2 z-50"
                >
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-medium text-foreground">{fullName}</p>
                    <p className="text-xs text-muted-foreground">{roleLabel}</p>
                  </div>
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors">
                    <User className="w-4 h-4" />
                    Mi Perfil
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors">
                    <Settings className="w-4 h-4" />
                    Configuración
                  </button>
                  <div className="border-t border-border my-1" />
                  <div className="px-2 py-1">
                    {logoutButton}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  )
}
