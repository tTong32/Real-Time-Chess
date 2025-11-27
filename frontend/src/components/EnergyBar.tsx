import React from 'react';

interface EnergyBarProps {
  energy: number;
  maxEnergy: number;
  color: 'white' | 'black';
  regenRate?: number;
  className?: string;
}

export const EnergyBar: React.FC<EnergyBarProps> = ({
  energy,
  maxEnergy,
  color,
  regenRate,
  className = '',
}) => {
  const percentage = Math.min(100, (energy / maxEnergy) * 100);
  const isLow = energy < 5; // Low energy threshold

  const energyColorClass = color === 'white' ? 'energy-white' : 'energy-black';
  const lowEnergyClass = isLow ? 'energy-low' : '';

  return (
    <div
      className={`energy-bar ${energyColorClass} ${lowEnergyClass} ${className}`}
      data-testid="energy-bar"
    >
      <div className="energy-bar-header">
        <span className="energy-label">Energy</span>
        <span className="energy-value">
          {Math.floor(energy)} / {maxEnergy}
        </span>
        {regenRate !== undefined && (
          <span className="energy-regen">+{regenRate.toFixed(1)}/s</span>
        )}
      </div>
      <div
        className="energy-bar-fill"
        role="progressbar"
        aria-valuenow={energy}
        aria-valuemin={0}
        aria-valuemax={maxEnergy}
        aria-label={`Energy: ${Math.floor(energy)} of ${maxEnergy}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

