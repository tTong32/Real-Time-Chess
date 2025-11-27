import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '../test/utils';
import { EnergyBar } from './EnergyBar';

describe('EnergyBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render energy bar with current energy', () => {
    render(<EnergyBar energy={10} maxEnergy={25} color="white" />);

    expect(screen.getByText('10 / 25')).toBeInTheDocument();
    expect(screen.getByText('Energy')).toBeInTheDocument();
  });

  it('should display correct energy percentage', () => {
    render(<EnergyBar energy={12.5} maxEnergy={25} color="white" />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '12.5');
    expect(bar).toHaveAttribute('aria-valuemax', '25');
  });

  it('should apply correct color class for white player', () => {
    render(<EnergyBar energy={15} maxEnergy={25} color="white" />);

    const container = screen.getByTestId('energy-bar');
    expect(container.className).toContain('energy-white');
  });

  it('should apply correct color class for black player', () => {
    render(<EnergyBar energy={15} maxEnergy={25} color="black" />);

    const container = screen.getByTestId('energy-bar');
    expect(container.className).toContain('energy-black');
  });

  it('should show low energy warning when energy is below threshold', () => {
    render(<EnergyBar energy={3} maxEnergy={25} color="white" />);

    const container = screen.getByTestId('energy-bar');
    expect(container.className).toContain('energy-low');
  });

  it('should not show low energy warning when energy is above threshold', () => {
    render(<EnergyBar energy={10} maxEnergy={25} color="white" />);

    const container = screen.getByTestId('energy-bar');
    expect(container.className).not.toContain('energy-low');
  });

  it('should display energy regeneration rate', () => {
    render(<EnergyBar energy={15} maxEnergy={25} color="white" regenRate={0.5} />);

    expect(screen.getByText(/\+0\.5\/s/)).toBeInTheDocument();
  });

  it('should be accessible with proper ARIA attributes', () => {
    render(<EnergyBar energy={15} maxEnergy={25} color="white" />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-label');
    expect(bar).toHaveAttribute('aria-valuenow');
    expect(bar).toHaveAttribute('aria-valuemax');
    expect(bar).toHaveAttribute('aria-valuemin');
  });
});

