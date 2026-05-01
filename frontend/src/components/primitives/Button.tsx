import React from 'react'

type ButtonVariant = 'ghost' | 'outline' | 'danger'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  isLoading?: boolean
  children: React.ReactNode
}

/**
 * Button component with three variants: ghost, outline, danger
 * 
 * Aligned with the AgentBoard design specification:
 * - 2px border radius
 * - 1px borders with signal color for focus
 * - No shadow elevation
 * - Clean, minimal styling
 * 
 * @example
 * <Button variant="outline">Click me</Button>
 * <Button variant="danger" onClick={handleDelete}>Delete</Button>
 * <Button variant="ghost">Cancel</Button>
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'ghost',
      isLoading = false,
      disabled = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = `
      px-card py-snug
      rounded-sm
      transition-all duration-fast
      focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-signal
      disabled:opacity-50 disabled:cursor-not-allowed
      font-body text-body
      inline-flex items-center justify-center gap-tight
      whitespace-nowrap
    `

    const variantClasses = {
      ghost: `
        text-ink hover:text-ink hover:bg-ink4
        border border-transparent
      `,
      outline: `
        text-ink
        border border-hair border-ink3
        hover:border-ink hover:bg-paper-2
      `,
      danger: `
        text-ink hover:text-signal-ink
        border border-hair border-warn
        hover:bg-warn hover:border-warn
      `,
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          ${baseClasses}
          ${variantClasses[variant]}
          ${className}
        `}
        data-testid={`button-${variant}`}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-tight" />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
