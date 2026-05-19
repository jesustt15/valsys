import * as React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'link' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xl'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const base = 'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer'

    const variants: Record<string, string> = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
      outline: 'border border-border bg-background hover:bg-secondary hover:text-secondary-foreground shadow-sm',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'hover:bg-secondary hover:text-secondary-foreground',
      link: 'text-primary underline-offset-4 hover:underline',
    }

    const sizes: Record<string, string> = {
      default: 'h-11 px-5 py-2.5 text-sm',
      sm: 'h-9 rounded-lg px-3.5 text-xs',
      lg: 'h-13 rounded-xl px-7 text-base',
      xl: 'h-14 rounded-xl px-8 text-lg',
      icon: 'h-11 w-11',
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export { Button }
