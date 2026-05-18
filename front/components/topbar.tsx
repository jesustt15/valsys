'use client'

import { ReactNode } from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

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
    <header className="sticky top-0 z-40 bg-white dark:bg-card border-b border-border h-16 flex items-center px-6">
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <button className="relative p-2 text-foreground hover:bg-secondary rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-foreground">{fullName}</span>
              <span className="text-xs text-muted-foreground">{roleLabel}</span>
            </div>
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">
              {initials}
            </div>
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-card border border-border rounded-lg shadow-lg py-2 z-50">
              <a
                href="#"
                className="block px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                Mi Perfil
              </a>
              <a
                href="#"
                className="block px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
              >
                Configuración
              </a>
              <div className="border-t border-border my-1" />
              {logoutButton}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
