import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

export const MatchmakingUI: React.FC = () => {
  const socket = useSocket();
  const [isSearching, setIsSearching] = useState(false);
  const [queueSize, setQueueSize] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matchFound, setMatchFound] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleMatchmakingStarted = (data: { queueSize: number }) => {
      setIsSearching(true);
      setQueueSize(data.queueSize);
      setError(null);
      setMatchFound(false);
    };

    const handleMatchFound = (data: { gameId: string }) => {
      setMatchFound(true);
      setIsSearching(false);
      setQueueSize(null);
      setError(null);
    };

    const handleMatchmakingError = (data: { error: string }) => {
      setError(data.error);
      setIsSearching(false);
      setQueueSize(null);
    };

    const handleMatchmakingCancelled = () => {
      setIsSearching(false);
      setQueueSize(null);
      setError(null);
      setMatchFound(false);
    };

    const handleMatchmakingStatus = (data: {
      inQueue: boolean;
      queueInfo: any;
      queueSize: number;
    }) => {
      if (data.inQueue) {
        setIsSearching(true);
        setQueueSize(data.queueSize);
      } else {
        setIsSearching(false);
        setQueueSize(null);
      }
    };

    socket.on('matchmakingStarted', handleMatchmakingStarted);
    socket.on('matchFound', handleMatchFound);
    socket.on('matchmakingError', handleMatchmakingError);
    socket.on('matchmakingCancelled', handleMatchmakingCancelled);
    socket.on('matchmakingStatus', handleMatchmakingStatus);

    // Request current status on mount
    // Note: getMatchmakingStatus is handled by checking socket events
    // The status will be updated when matchmakingStatus event is received

    return () => {
      socket.off('matchmakingStarted', handleMatchmakingStarted);
      socket.off('matchFound', handleMatchFound);
      socket.off('matchmakingError', handleMatchmakingError);
      socket.off('matchmakingCancelled', handleMatchmakingCancelled);
      socket.off('matchmakingStatus', handleMatchmakingStatus);
    };
  }, [socket]);

  const handleFindMatch = () => {
    if (!socket.connected) {
      setError('Not connected to server');
      return;
    }
    socket.requestMatchmaking();
  };

  const handleCancel = () => {
    if (!socket.connected) {
      return;
    }
    socket.cancelMatchmaking();
  };

  if (matchFound) {
    return (
      <div className="matchmaking-ui" data-testid="matchmaking-ui">
        <div className="matchmaking-status matchmaking-success">
          <p>Match found! Starting game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="matchmaking-ui" data-testid="matchmaking-ui">
      {error && (
        <div className="matchmaking-error" role="alert">
          {error}
        </div>
      )}

      {isSearching ? (
        <div className="matchmaking-searching">
          <div className="matchmaking-status">
            <p>Searching for opponent...</p>
            {queueSize !== null && (
              <p className="queue-size">{queueSize} player{queueSize !== 1 ? 's' : ''} in queue</p>
            )}
          </div>
          <button
            className="matchmaking-button matchmaking-cancel"
            onClick={handleCancel}
            disabled={!socket.connected}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          className="matchmaking-button matchmaking-find"
          onClick={handleFindMatch}
          disabled={!socket.connected}
        >
          Find Match
        </button>
      )}
    </div>
  );
};

