import * as React from 'react'
import { cn } from '../../lib/utils'

const buttonVariants = {
  default: 'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-indigo-600 dark:hover:bg-indigo-500',
  destructive: 'bg-red-600 text-white hover:bg-red-500',
  outline: 'border border-neutral-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 hover:bg-neutral-100 dark:hover:bg-slate-800',
  secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
  ghost: 'hover:bg-neutral-100 dark:hover:bg-slate-800/60',
  link: 'text-neutral-900 dark:text-slate-100 underline-offset-4 hover:underline',
} as const

const buttonSizes = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 px-3',
  lg: 'h-11 px-8',
  icon: 'h-10 w-10',
} as const

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants
  size?: keyof typeof buttonSizes
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-50',
          buttonVariants[variant],
          buttonSizes[size],
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
