import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Reset document class
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('renders toggle button', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label');
  });

  it('toggles theme when clicked', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    
    // Initially should be light mode
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    
    // Click to toggle to dark
    fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    
    // Click to toggle back to light
    fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('loads saved theme from localStorage on mount', () => {
    localStorage.setItem('theme', 'dark');
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('saves theme to localStorage when toggled', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    
    fireEvent.click(button);
    expect(localStorage.getItem('theme')).toBe('dark');
    
    fireEvent.click(button);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('applies custom className', () => {
    render(<ThemeToggle className="custom-class" />);
    const button = screen.getByRole('button');
    expect(button.className).toContain('custom-class');
  });
});

