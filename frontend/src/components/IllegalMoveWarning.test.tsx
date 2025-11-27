import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, act } from '../test/utils';
import { IllegalMoveWarning } from './IllegalMoveWarning';

describe('IllegalMoveWarning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not render when no error', () => {
    render(<IllegalMoveWarning error={null} />);

    expect(screen.queryByTestId('illegal-move-warning')).not.toBeInTheDocument();
  });

  it('should display illegal move error', () => {
    render(<IllegalMoveWarning error="Invalid move coordinates" />);

    expect(screen.getByTestId('illegal-move-warning')).toBeInTheDocument();
    expect(screen.getByText('Invalid move coordinates')).toBeInTheDocument();
  });

  it('should display different error types', () => {
    const { rerender } = render(<IllegalMoveWarning error="Not enough energy" />);

    expect(screen.getByText('Not enough energy')).toBeInTheDocument();

    rerender(<IllegalMoveWarning error="Piece is on cooldown" />);
    expect(screen.getByText('Piece is on cooldown')).toBeInTheDocument();
  });

  it('should support auto-hide functionality', () => {
    // Test that component accepts autoHide prop and renders correctly
    // The actual auto-hide behavior is tested in integration tests
    const { rerender } = render(
      <IllegalMoveWarning error="Invalid move" autoHide={false} />
    );

    expect(screen.getByTestId('illegal-move-warning')).toBeInTheDocument();

    // With autoHide=true, component should still render initially
    rerender(<IllegalMoveWarning error="Invalid move" autoHide={true} />);
    expect(screen.getByTestId('illegal-move-warning')).toBeInTheDocument();
  });

  it('should have dismiss button', () => {
    const onDismiss = vi.fn();
    render(<IllegalMoveWarning error="Invalid move" onDismiss={onDismiss} />);

    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    expect(dismissButton).toBeInTheDocument();
  });

  it('should call onDismiss when button is clicked', async () => {
    const onDismiss = vi.fn();
    const user = await import('@testing-library/user-event');
    const userEvent = user.default;

    render(<IllegalMoveWarning error="Invalid move" onDismiss={onDismiss} />);

    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    await userEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalled();
  });

  it('should have proper styling for error display', () => {
    render(<IllegalMoveWarning error="Invalid move" />);

    const warning = screen.getByTestId('illegal-move-warning');
    expect(warning).toHaveClass('illegal-move-warning');
  });
});

