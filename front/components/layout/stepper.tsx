'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const steps = [
  { id: 1, label: 'Dueño', href: '/owners/new' },
  { id: 2, label: 'Vehículo', href: '/vehicles/new' },
  { id: 3, label: 'Inspección', href: '/inspections/new' },
  { id: 4, label: 'Cilindros', href: '/cylinders' },
  { id: 5, label: 'Recertificación', href: '/recertification' },
  { id: 6, label: 'Montaje', href: '/remounting' },
  { id: 7, label: 'Certificado', href: '/certificates' },
]

export function WorkflowStepper({
  currentStep,
}: {
  currentStep?: number
}) {
  const pathname = usePathname()

  // Detect current step from URL if not provided
  const activeStep =
    currentStep ??
    (steps.findIndex((s) => pathname.startsWith(s.href)) + 1 || 1)

  return (
    <nav className="w-full overflow-x-auto" aria-label="Workflow steps">
      <ol className="flex items-center min-w-max gap-0">
        {steps.map((step, i) => {
          const isActive = step.id === activeStep
          const isCompleted = step.id < activeStep

          return (
            <li key={step.id} className="flex items-center">
              {/* Step */}
              <Link
                href={step.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive ? 'bg-green-50 text-green-700 ring-1 ring-green-200' : ''}
                  ${isCompleted ? 'text-green-600 hover:bg-green-50' : ''}
                  ${!isActive && !isCompleted ? 'text-muted-foreground hover:text-foreground hover:bg-secondary/50' : ''}
                `}
              >
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold
                    ${isActive ? 'bg-green-600 text-white' : ''}
                    ${isCompleted ? 'bg-green-500 text-white' : ''}
                    ${!isActive && !isCompleted ? 'bg-secondary/50 text-muted-foreground' : ''}
                  `}
                >
                  {isCompleted ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </span>
                <span className="whitespace-nowrap">{step.label}</span>
              </Link>

              {/* Connector */}
              {i < steps.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 flex-shrink-0
                    ${isCompleted ? 'bg-green-400' : 'bg-border'}
                  `}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
