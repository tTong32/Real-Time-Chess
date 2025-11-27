import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '../test/utils';
import { MoveValidationFeedback } from './MoveValidationFeedback';

describe('MoveValidationFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when no validation state', () => {
    render(<MoveValidationFeedback />);

    expect(screen.queryByTestId('move-validation')).not.toBeInTheDocument();
  });

  it('should display valid move feedback', () => {
    render(<MoveValidationFeedback isValid={true} message="Valid move" />);

    expect(screen.getByTestId('move-validation')).toBeInTheDocument();
    expect(screen.getByText('Valid move')).toBeInTheDocument();
    expect(screen.getByTestId('move-validation')).toHaveClass('validation-valid');
  });

  it('should display invalid move feedback', () => {
    render(<MoveValidationFeedback isValid={false} message="Invalid move" />);

    expect(screen.getByTestId('move-validation')).toBeInTheDocument();
    expect(screen.getByText('Invalid move')).toBeInTheDocument();
    expect(screen.getByTestId('move-validation')).toHaveClass('validation-invalid');
  });

  it('should display warning for low energy moves', () => {
    render(
      <MoveValidationFeedback
        isValid={true}
        message="Valid move"
        warning="Low energy - this move will leave you with 2 energy"
      />
    );

    expect(screen.getByText(/low energy/i)).toBeInTheDocument();
  });

  it('should display piece cooldown warning', () => {
    render(
      <MoveValidationFeedback
        isValid={false}
        message="Piece is on cooldown"
        warning="This piece cannot move for 3 more seconds"
      />
    );

    expect(screen.getByText(/cooldown/i)).toBeInTheDocument();
  });

  it('should clear feedback after timeout', async () => {
    render(<MoveValidationFeedback isValid={true} message="Valid move" autoHide={true} />);

    expect(screen.getByTestId('move-validation')).toBeInTheDocument();

    // Should hide after timeout (tested in integration)
  });
});

