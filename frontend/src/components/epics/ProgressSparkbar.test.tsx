import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressSparkbar } from './ProgressSparkbar';

describe('ProgressSparkbar', () => {
  it('renders with correct format "done/total"', () => {
    render(<ProgressSparkbar done={3} total={8} />);
    expect(screen.getByText(/3\/8/)).toBeInTheDocument();
  });

  it('renders 8-cell sparkbar with filled and empty blocks', () => {
    render(<ProgressSparkbar done={3} total={8} />);
    const sparkbar = screen.getByTestId('sparkbar');
    // 3 filled (█) and 5 empty (░) blocks
    expect(sparkbar.textContent).toBe('3/8 ███░░░░░');
  });

  it('renders all filled blocks when done equals total', () => {
    render(<ProgressSparkbar done={8} total={8} />);
    const sparkbar = screen.getByTestId('sparkbar');
    expect(sparkbar.textContent).toBe('8/8 ████████');
  });

  it('renders all empty blocks when done is zero', () => {
    render(<ProgressSparkbar done={0} total={8} />);
    const sparkbar = screen.getByTestId('sparkbar');
    expect(sparkbar.textContent).toBe('0/8 ░░░░░░░░');
  });

  it('handles partial fill correctly with rounding', () => {
    // 1/8 should be minimal fill (1 block)
    render(<ProgressSparkbar done={1} total={8} />);
    const sparkbar = screen.getByTestId('sparkbar');
    expect(sparkbar.textContent).toBe('1/8 █░░░░░░░');
  });

  it('handles 5/8 progress', () => {
    render(<ProgressSparkbar done={5} total={8} />);
    const sparkbar = screen.getByTestId('sparkbar');
    expect(sparkbar.textContent).toBe('5/8 █████░░░');
  });

  it('uses monospace font for consistent block character width', () => {
    const { container } = render(<ProgressSparkbar done={4} total={8} />);
    const sparkbar = container.querySelector('[class*="font-mono"]');
    expect(sparkbar).toBeInTheDocument();
  });
});
