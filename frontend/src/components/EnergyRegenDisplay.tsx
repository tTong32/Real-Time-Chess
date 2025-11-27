import React, { useState, useEffect } from 'react';

interface EnergyRegenDisplayProps {
  regenRate: number;
  currentEnergy: number;
  maxEnergy: number;
  lastEnergyUpdate?: number;
  className?: string;
}

export const EnergyRegenDisplay: React.FC<EnergyRegenDisplayProps> = ({
  regenRate,
  currentEnergy,
  maxEnergy,
  lastEnergyUpdate,
  className = '',
}) => {
  const [timeToNextPoint, setTimeToNextPoint] = useState<number | null>(null);
  const [progressToNext, setProgressToNext] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      if (currentEnergy >= maxEnergy) {
        setTimeToNextPoint(null);
        setProgressToNext(0);
        return;
      }

      // Calculate time until next energy point
      const fractionalPart = currentEnergy % 1;
      const energyNeeded = 1 - fractionalPart;
      const timeNeeded = (energyNeeded / regenRate) * 1000; // Convert to milliseconds

      setTimeToNextPoint(Math.ceil(timeNeeded / 1000)); // Convert to seconds
      setProgressToNext((fractionalPart / 1) * 100); // Progress percentage
    };

    updateProgress();

    // Update every second
    const interval = setInterval(updateProgress, 1000);

    return () => clearInterval(interval);
  }, [currentEnergy, maxEnergy, regenRate]);

  if (currentEnergy >= maxEnergy) {
    return (
      <div className={`energy-regen-display ${className}`} data-testid="energy-regen-display">
        <div className="energy-regen-rate">
          <span className="regen-value">+{regenRate.toFixed(1)}</span>
          <span className="regen-unit"> per second</span>
        </div>
        <div className="energy-regen-status">Energy at maximum</div>
      </div>
    );
  }

  return (
    <div className={`energy-regen-display ${className}`} data-testid="energy-regen-display">
      <div className="energy-regen-rate">
        <span className="regen-value">+{regenRate.toFixed(1)}</span>
        <span className="regen-unit"> per second</span>
      </div>
      {timeToNextPoint !== null && (
        <div className="energy-regen-progress">
          <div className="regen-progress-label">Next point in {timeToNextPoint}s</div>
          <div
            className="regen-progress-bar"
            role="progressbar"
            aria-valuenow={progressToNext}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progress to next energy point: ${progressToNext.toFixed(0)}%`}
          >
            <div
              className="regen-progress-fill"
              style={{ width: `${progressToNext}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

