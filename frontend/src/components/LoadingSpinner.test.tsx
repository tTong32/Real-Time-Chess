import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default size', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  it('renders with custom size', () => {
    render(<LoadingSpinner size="large" />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner.className).toContain('spinner-large');
  });

  it('renders with custom label', () => {
    render(<LoadingSpinner label="Loading game..." />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading game...');
  });

  it('renders with full screen overlay when fullScreen is true', () => {
    render(<LoadingSpinner fullScreen />);
    const spinner = screen.getByRole('status');
    expect(spinner.className).toContain('spinner-fullscreen');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    const spinner = screen.getByRole('status');
    expect(spinner.className).toContain('custom-class');
  });
});

