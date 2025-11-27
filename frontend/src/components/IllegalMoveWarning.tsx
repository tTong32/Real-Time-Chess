import React, { useEffect, useState } from 'react';

interface IllegalMoveWarningProps {
  error: string | null;
  autoHide?: boolean;
  hideDelay?: number;
  onDismiss?: () => void;
  className?: string;
}

export const IllegalMoveWarning: React.FC<IllegalMoveWarningProps> = ({
  error,
  autoHide = true,
  hideDelay = 3000,
  onDismiss,
  className = '',
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setVisible(true);

      if (autoHide) {
        const timer = setTimeout(() => {
          setVisible(false);
          onDismiss?.();
        }, hideDelay);

        return () => clearTimeout(timer);
      }
    } else {
      setVisible(false);
    }
  }, [error, autoHide, hideDelay, onDismiss]);

  if (!visible || !error) {
    return null;
  }

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div
      className={`illegal-move-warning ${className}`}
      data-testid="illegal-move-warning"
      role="alert"
    >
      <div className="warning-content">
        <span className="warning-icon">⚠️</span>
        <span className="warning-message">{error}</span>
      </div>
      {onDismiss && (
        <button
          className="warning-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss warning"
        >
          ×
        </button>
      )}
    </div>
  );
};

