import React from 'react';
import { useGame } from '../contexts/GameContext';
import { useAuth } from '../contexts/AuthContext';

export const GameStatus: React.FC = () => {
  const { gameState, isWhitePlayer, error } = useGame();
  const { user } = useAuth();

  if (!gameState) {
    return (
      <div className="game-status" data-testid="game-status">
        <div className="status-message">No active game</div>
      </div>
    );
  }

  const getStatusMessage = () => {
    switch (gameState.status) {
      case 'waiting':
        return 'Waiting for players...';
      case 'active':
        return 'Game in progress';
      case 'paused':
        return 'Game paused';
      case 'finished':
        if (gameState.winner === null) {
          return 'Game ended in a draw';
        }
        const userWon =
          (gameState.winner === 'white' && isWhitePlayer === true) ||
          (gameState.winner === 'black' && isWhitePlayer === false);
        return userWon ? 'You won!' : 'You lost!';
      default:
        return 'Unknown status';
    }
  };

  const getStatusClass = () => {
    const baseClass = 'game-status';
    if (gameState.status === 'finished') {
      const userWon =
        (gameState.winner === 'white' && isWhitePlayer === true) ||
        (gameState.winner === 'black' && isWhitePlayer === false);
      return `${baseClass} ${userWon ? 'status-won' : 'status-lost'}`;
    }
    return baseClass;
  };

  return (
    <div className={getStatusClass()} data-testid="game-status">
      <div className="status-message">{getStatusMessage()}</div>
      {error && <div className="status-error">{error}</div>}
      {gameState.status === 'finished' && (
        <div className="status-winner">
          Winner: {gameState.winner === 'white' ? 'White' : 'Black'}
        </div>
      )}
    </div>
  );
};

