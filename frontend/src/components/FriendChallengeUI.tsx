import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

export const FriendChallengeUI: React.FC = () => {
  const socket = useSocket();
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerJoined, setPlayerJoined] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = (data: { roomCode: string }) => {
      setRoomCode(data.roomCode);
      setError(null);
      setIsCreating(false);
    };

    const handleRoomJoined = (data: { gameId: string; roomCode: string }) => {
      setGameId(data.gameId);
      setRoomCode(data.roomCode);
    };

    const handlePlayerJoined = (data: { gameId: string; userId: string }) => {
      setPlayerJoined(true);
      setGameId(data.gameId);
    };

    const handleGameWaiting = (data: { gameId: string }) => {
      setGameId(data.gameId);
    };

    const handleRoomError = (data: { error: string }) => {
      setError(data.error);
      setIsCreating(false);
    };

    socket.on('roomCreated', handleRoomCreated);
    socket.on('roomJoined', handleRoomJoined);
    socket.on('playerJoined', handlePlayerJoined);
    socket.on('gameWaiting', handleGameWaiting);
    socket.on('roomError', handleRoomError);

    return () => {
      socket.off('roomCreated', handleRoomCreated);
      socket.off('roomJoined', handleRoomJoined);
      socket.off('playerJoined', handlePlayerJoined);
      socket.off('gameWaiting', handleGameWaiting);
      socket.off('roomError', handleRoomError);
    };
  }, [socket]);

  const handleCreateRoom = () => {
    if (!socket.connected) {
      setError('Not connected to server');
      return;
    }
    setIsCreating(true);
    setError(null);
    socket.createRoom();
  };

  const handleStartGame = () => {
    if (!gameId || !socket.connected) {
      return;
    }
    socket.startGame(gameId);
  };

  return (
    <div className="friend-challenge-ui" data-testid="friend-challenge-ui">
      <div className="friend-challenge-header">
        <h3>Challenge a Friend</h3>
        <p className="friend-challenge-description">
          Create a room and share the code with a friend
        </p>
      </div>

      {!roomCode ? (
        <div className="friend-challenge-create">
          <button
            className="friend-challenge-button"
            onClick={handleCreateRoom}
            disabled={!socket.connected || isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      ) : (
        <div className="friend-challenge-room">
          <div className="room-code-display">
            <label>Room Code:</label>
            <div className="room-code-value">{roomCode}</div>
            <p className="room-code-share">Share this code with your friend</p>
          </div>

          {!playerJoined ? (
            <div className="friend-challenge-waiting">
              <p>Waiting for player to join...</p>
            </div>
          ) : (
            <div className="friend-challenge-ready">
              <p className="player-joined-message">Player joined!</p>
              <button
                className="friend-challenge-start"
                onClick={handleStartGame}
                disabled={!socket.connected}
              >
                Start Game
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="friend-challenge-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

