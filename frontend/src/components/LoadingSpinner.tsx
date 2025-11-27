import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  label?: string;
  fullScreen?: boolean;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  label = 'Loading',
  fullScreen = false,
  className = '',
}) => {
  const sizeClasses = {
    small: 'spinner-small',
    medium: 'spinner-medium',
    large: 'spinner-large',
  };

  const classes = [
    'loading-spinner',
    sizeClasses[size],
    fullScreen ? 'spinner-fullscreen' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      <div className="spinner-circle" aria-hidden="true">
        <div className="spinner-segment" />
        <div className="spinner-segment" />
        <div className="spinner-segment" />
        <div className="spinner-segment" />
      </div>
      {label && <span className="spinner-label">{label}</span>}
    </div>
  );
};

