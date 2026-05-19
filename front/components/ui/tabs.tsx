import * as React from 'react'
import { cn } from '@/lib/utils'

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

const TabsContext = React.createContext<{
  value: string
  onValueChange: (value: string) => void
}>({ value: '', onValueChange: () => {} })

function Tabs({ value, onValueChange, children, className = '' }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('w-full', className)} {...{ 'data-tabs': '' }}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

function TabsList({ className = '', ...props }: TabsListProps) {
  return (
    <div
      className={cn(
        'inline-flex h-12 items-center justify-center rounded-xl bg-muted p-1 text-muted-foreground',
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({ className = '', value, ...props }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = React.useContext(TabsContext)
  const isActive = selectedValue === value

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium',
        'transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-background text-foreground shadow-sm'
          : 'hover:text-foreground',
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className = '', value, ...props }: TabsContentProps) {
  const { value: selectedValue } = React.useContext(TabsContext)
  if (selectedValue !== value) return null

  return (
    <div
      role="tabpanel"
      className={cn(
        'mt-4 focus-visible:outline-none',
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
