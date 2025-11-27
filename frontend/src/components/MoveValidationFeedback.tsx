import React, { useEffect, useState } from 'react';

interface MoveValidationFeedbackProps {
  isValid?: boolean;
  message?: string;
  warning?: string;
  autoHide?: boolean;
  hideDelay?: number;
  onHide?: () => void;
  className?: string;
}

export const MoveValidationFeedback: React.FC<MoveValidationFeedbackProps> = ({
  isValid,
  message,
  warning,
  autoHide = false,
  hideDelay = 3000,
  onHide,
  className = '',
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!isValid && !message) {
      setVisible(false);
      return;
    }

    setVisible(true);

    if (autoHide && (isValid || message)) {
      const timer = setTimeout(() => {
        setVisible(false);
        onHide?.();
      }, hideDelay);

      return () => clearTimeout(timer);
    }
  }, [isValid, message, autoHide, hideDelay, onHide]);

  if (!visible || isValid === undefined || !message) {
    return null;
  }

  const validationClass = isValid ? 'validation-valid' : 'validation-invalid';

  return (
    <div
      className={`move-validation-feedback ${validationClass} ${className}`}
      data-testid="move-validation"
      role="alert"
    >
      <div className="validation-message">{message}</div>
      {warning && <div className="validation-warning">{warning}</div>}
    </div>
  );
};

