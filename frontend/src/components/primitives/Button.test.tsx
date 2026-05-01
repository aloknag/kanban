import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { Button } from './Button'

describe('Button Component', () => {
  it('should render button with ghost variant by default', () => {
    render(<Button>Click me</Button>)
    
    const button = screen.getByTestId('button-ghost')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Click me')
  })

  it('should render button with outline variant', () => {
    render(<Button variant="outline">Outline Button</Button>)
    
    const button = screen.getByTestId('button-outline')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Outline Button')
  })

  it('should render button with danger variant', () => {
    render(<Button variant="danger">Delete</Button>)
    
    const button = screen.getByTestId('button-danger')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Delete')
  })

  it('should handle click events', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByTestId('button-ghost')
    button.click()
    
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>)
    
    const button = screen.getByTestId('button-ghost') as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('should be disabled when loading', () => {
    render(<Button isLoading>Loading</Button>)
    
    const button = screen.getByTestId('button-ghost') as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('should show loading spinner when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>)
    
    const button = screen.getByTestId('button-ghost')
    const spinner = button.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('should not call onClick when disabled', () => {
    const handleClick = vi.fn()
    render(<Button disabled onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByTestId('button-ghost') as HTMLButtonElement
    button.click()
    
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('should accept custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    
    const button = screen.getByTestId('button-ghost')
    expect(button).toHaveClass('custom-class')
  })

  it('should accept custom data attributes', () => {
    render(<Button data-custom="test-value">Custom Attr</Button>)
    
    const button = screen.getByTestId('button-ghost')
    expect(button).toHaveAttribute('data-custom', 'test-value')
  })

  it('should be focusable', () => {
    render(<Button>Focus Test</Button>)
    
    const button = screen.getByTestId('button-ghost')
    button.focus()
    
    expect(button).toHaveFocus()
  })

  it('should have proper semantic role', () => {
    render(<Button>Semantic Button</Button>)
    
    const button = screen.getByRole('button', { name: /semantic button/i })
    expect(button).toBeInTheDocument()
  })

  it('should support HTML button attributes', () => {
    render(
      <Button type="submit" aria-label="Submit form">
        Submit
      </Button>
    )
    
    const button = screen.getByTestId('button-ghost') as HTMLButtonElement
    expect(button.type).toBe('submit')
    expect(button).toHaveAttribute('aria-label', 'Submit form')
  })

  it('should render with correct data-testid for testing', () => {
    const variants = ['ghost', 'outline', 'danger'] as const
    
    variants.forEach((variant) => {
      const { unmount } = render(<Button variant={variant}>Test</Button>)
      
      const button = screen.getByTestId(`button-${variant}`)
      expect(button).toBeInTheDocument()
      
      unmount()
    })
  })

  it('should work as controlled component', () => {
    const handleClick = vi.fn()
    const { rerender } = render(
      <Button onClick={handleClick}>Click me</Button>
    )
    
    let button = screen.getByTestId('button-ghost')
    expect(button).toBeInTheDocument()
    
    button.click()
    expect(handleClick).toHaveBeenCalledOnce()
    
    rerender(<Button onClick={handleClick}>Updated</Button>)
    
    button = screen.getByTestId('button-ghost')
    expect(button).toHaveTextContent('Updated')
  })
})
