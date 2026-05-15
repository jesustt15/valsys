import * as React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50'

    const variants: Record<string, string> = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline: 'border border-border bg-background hover:bg-secondary hover:text-secondary-foreground',
      ghost: 'hover:bg-secondary hover:text-secondary-foreground',
      link: 'text-primary underline-offset-4 hover:underline',
    }

    const sizes: Record<string, string> = {
      default: 'h-10 px-4 py-2 text-sm',
      sm: 'h-9 rounded-md px-3 text-xs',
      lg: 'h-12 rounded-lg px-6 text-base',
      icon: 'h-10 w-10',
    }

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'

export { Button }
