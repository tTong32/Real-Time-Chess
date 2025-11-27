import React, { useEffect, useState } from 'react';

interface AnimatedTransitionProps {
  show: boolean;
  children: React.ReactNode;
  animation?: 'fade' | 'slide' | 'scale';
  duration?: number;
  className?: string;
}

export const AnimatedTransition: React.FC<AnimatedTransitionProps> = ({
  show,
  children,
  animation = 'fade',
  duration = 300,
  className = '',
}) => {
  const [shouldRender, setShouldRender] = useState(show);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      // Trigger animation after render
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      // Remove from DOM after animation
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  if (!shouldRender) return null;

  const classes = [
    'animated-transition',
    animation,
    isAnimating ? 'enter' : 'exit',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      style={{
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
};

