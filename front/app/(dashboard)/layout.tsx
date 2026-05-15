import { WorkflowStepper } from '@/components/layout/stepper'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">ValSys</h1>
              <span className="text-xs text-gray-400 border-l border-gray-300 pl-3">
                GNC Inspection System
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Stepper del workflow */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-3">
            <WorkflowStepper />
          </div>
        </div>
      </div>

      {/* Contenido */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
