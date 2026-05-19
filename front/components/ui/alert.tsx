import * as React from 'react'
import { cn } from '@/lib/utils'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning'
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const variants: Record<string, string> = {
      default: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-900/20 dark:text-blue-100 dark:border-blue-800',
      destructive: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-900/20 dark:text-red-100 dark:border-red-800',
      success: 'bg-green-50 text-green-900 border-green-200 dark:bg-green-900/20 dark:text-green-100 dark:border-green-800',
      warning: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/20 dark:text-amber-100 dark:border-amber-800',
    }

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-xl border p-4 [&>svg~*]:pl-7 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Alert.displayName = 'Alert'

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('mb-1 font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
)
AlertTitle.displayName = 'AlertTitle'

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-sm [&_p]:leading-relaxed', className)}
      {...props}
    />
  )
)
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertTitle, AlertDescription }
