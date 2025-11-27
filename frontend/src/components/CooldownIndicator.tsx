import React, { useState, useEffect } from 'react';

interface CooldownIndicatorProps {
  pieceId: string;
  cooldownEnd: number; // Timestamp in milliseconds
  row: number;
  col: number;
}

export const CooldownIndicator: React.FC<CooldownIndicatorProps> = ({
  pieceId,
  cooldownEnd,
  row,
  col,
}) => {
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  useEffect(() => {
    const updateCooldown = () => {
      const now = Date.now();
      const remaining = cooldownEnd - now;

      if (remaining <= 0) {
        setRemainingTime(null);
        return;
      }

      setRemainingTime(Math.ceil(remaining / 1000)); // Convert to seconds
    };

    // Update immediately
    updateCooldown();

    // Update every second
    const interval = setInterval(updateCooldown, 1000);

    return () => clearInterval(interval);
  }, [cooldownEnd]);

  // Don't render if cooldown has expired
  if (remainingTime === null || remainingTime <= 0) {
    return null;
  }

  return (
    <div
      className="cooldown-indicator"
      data-testid="cooldown-indicator"
      data-piece-id={pieceId}
      data-row={row}
      data-col={col}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
      }}
    >
      <div className="cooldown-timer">{remainingTime}s</div>
    </div>
  );
};

