import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

export const RoomCodeInput: React.FC = () => {
  const socket = useSocket();
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleRoomJoined = (data: { gameId: string; roomCode: string }) => {
      setSuccess(`Joined room ${data.roomCode}`);
      setError(null);
      setIsJoining(false);
    };

    const handleRoomError = (data: { error: string }) => {
      setError(data.error);
      setSuccess(null);
      setIsJoining(false);
    };

    socket.on('roomJoined', handleRoomJoined);
    socket.on('roomError', handleRoomError);

    return () => {
      socket.off('roomJoined', handleRoomJoined);
      socket.off('roomError', handleRoomError);
    };
  }, [socket]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setRoomCode(value);
    setError(null);
    setSuccess(null);
  };

  const handleJoin = () => {
    if (!roomCode || roomCode.length < 3) {
      setError('Invalid room code');
      return;
    }

    if (!socket.connected) {
      setError('Not connected to server');
      return;
    }

    setIsJoining(true);
    setError(null);
    setSuccess(null);
    socket.joinRoom(roomCode);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  return (
    <div className="room-code-input" data-testid="room-code-input">
      <div className="room-code-header">
        <h3>Join Room</h3>
        <p className="room-code-description">Enter a room code to join a friend's game</p>
      </div>

      <div className="room-code-form">
        <input
          type="text"
          placeholder="Room Code (e.g., ABC123)"
          value={roomCode}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          maxLength={10}
          className="room-code-field"
          disabled={isJoining}
        />
        <button
          className="room-code-button"
          onClick={handleJoin}
          disabled={!socket.connected || isJoining || !roomCode}
        >
          {isJoining ? 'Joining...' : 'Join'}
        </button>
      </div>

      {error && (
        <div className="room-code-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="room-code-success" role="status">
          {success}
        </div>
      )}
    </div>
  );
};

