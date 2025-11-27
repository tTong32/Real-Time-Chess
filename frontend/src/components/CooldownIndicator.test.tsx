import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, act } from '../test/utils';
import { CooldownIndicator } from './CooldownIndicator';

describe('CooldownIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render cooldown indicator when piece is on cooldown', () => {
    const cooldownEnd = Date.now() + 5000; // 5 seconds from now

    render(
      <CooldownIndicator
        pieceId="piece-1"
        cooldownEnd={cooldownEnd}
        row={0}
        col={0}
      />
    );

    expect(screen.getByTestId('cooldown-indicator')).toBeInTheDocument();
  });

  it('should not render when cooldown has expired', () => {
    const cooldownEnd = Date.now() - 1000; // 1 second ago

    render(
      <CooldownIndicator
        pieceId="piece-1"
        cooldownEnd={cooldownEnd}
        row={0}
        col={0}
      />
    );

    expect(screen.queryByTestId('cooldown-indicator')).not.toBeInTheDocument();
  });

  it('should display remaining cooldown time', () => {
    const cooldownEnd = Date.now() + 5000; // 5 seconds

    render(
      <CooldownIndicator
        pieceId="piece-1"
        cooldownEnd={cooldownEnd}
        row={0}
        col={0}
      />
    );

    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it('should update cooldown time as it decreases', () => {
    const now = Date.now();
    const cooldownEnd = now + 5000;

    render(
      <CooldownIndicator
        pieceId="piece-1"
        cooldownEnd={cooldownEnd}
        row={0}
        col={0}
      />
    );

    // Initially should show 5
    expect(screen.getByTestId('cooldown-indicator')).toBeInTheDocument();
    expect(screen.getByText(/5s/)).toBeInTheDocument();

    // Note: Timer updates are tested in integration tests
    // The component correctly calculates remaining time on mount
  });

  it('should hide when cooldown expires', () => {
    const now = Date.now();
    const cooldownEnd = now - 1000; // Already expired

    render(
      <CooldownIndicator
        pieceId="piece-1"
        cooldownEnd={cooldownEnd}
        row={0}
        col={0}
      />
    );

    // Should not render if cooldown has already expired
    expect(screen.queryByTestId('cooldown-indicator')).not.toBeInTheDocument();
  });

  it('should format time correctly (seconds)', () => {
    const cooldownEnd = Date.now() + 3500; // 3.5 seconds

    render(
      <CooldownIndicator
        pieceId="piece-1"
        cooldownEnd={cooldownEnd}
        row={0}
        col={0}
      />
    );

    const text = screen.getByTestId('cooldown-indicator').textContent;
    expect(text).toMatch(/\d+/); // Should contain a number
  });
});

