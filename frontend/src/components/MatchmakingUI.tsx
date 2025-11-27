import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { LoadingSpinner } from './LoadingSpinner';
import { AnimatedTransition } from './AnimatedTransition';

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
        <AnimatedTransition show={true} animation="fade">
          <div className="matchmaking-status matchmaking-success" role="status" aria-live="polite">
            <p>Match found! Starting game...</p>
          </div>
        </AnimatedTransition>
      </div>
    );
  }

  return (
    <div className="matchmaking-ui" data-testid="matchmaking-ui">
      <AnimatedTransition show={!!error} animation="slide">
        {error && (
          <div className="matchmaking-error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}
      </AnimatedTransition>

      {isSearching ? (
        <AnimatedTransition show={true} animation="fade">
          <div className="matchmaking-searching">
            <div className="matchmaking-status">
              <LoadingSpinner size="small" label="Searching for opponent..." />
              {queueSize !== null && (
                <p className="queue-size" aria-live="polite">
                  {queueSize} player{queueSize !== 1 ? 's' : ''} in queue
                </p>
              )}
            </div>
            <button
              className="matchmaking-button matchmaking-cancel"
              onClick={handleCancel}
              disabled={!socket.connected}
              aria-label="Cancel matchmaking search"
            >
              Cancel
            </button>
          </div>
        </AnimatedTransition>
      ) : (
        <AnimatedTransition show={true} animation="scale">
          <button
            className="matchmaking-button matchmaking-find"
            onClick={handleFindMatch}
            disabled={!socket.connected}
            aria-label="Find a match"
          >
            Find Match
          </button>
        </AnimatedTransition>
      )}
    </div>
  );
};

