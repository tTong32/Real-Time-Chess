import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface GameState {
  id: string;
  board: any[][];
  whiteState: any;
  blackState: any;
  whitePlayerId: string;
  blackPlayerId: string;
  currentTurn: string | null;
  status: 'waiting' | 'active' | 'paused' | 'finished';
  winner: 'white' | 'black' | null;
  startedAt: number | null;
  lastMoveAt: number | null;
}

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  socketId: string | null;
  error: string | null;
  // Event handlers
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler?: (...args: any[]) => void) => void;
  // Game actions
  requestMatchmaking: () => void;
  cancelMatchmaking: () => void;
  createRoom: () => void;
  joinRoom: (roomCode: string) => void;
  makeMove: (gameId: string, fromRow: number, fromCol: number, toRow: number, toCol: number) => void;
  startGame: (gameId: string) => void;
  spectateGame: (gameId: string) => void;
  leaveGame: (gameId: string) => void;
  requestGameState: (gameId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 1000; // Start with 1 second

  // Get server URL from environment or use default
  const getServerUrl = () => {
    return import.meta.env.VITE_API_URL || 'http://localhost:3000';
  };

  // Connect to socket server
  useEffect(() => {
    if (!token || !user) {
      // Disconnect if no token
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
        setSocketId(null);
      }
      return;
    }

    // Don't reconnect if already connected
    if (socketRef.current?.connected) {
      return;
    }

    const serverUrl = getServerUrl();
    const newSocket = io(serverUrl, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: RECONNECT_DELAY,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setConnected(true);
      setSocketId(newSocket.id);
      setError(null);
      reconnectAttempts.current = 0;
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
      setSocketId(null);

      // Handle reconnection
      if (reason === 'io server disconnect') {
        // Server disconnected, need to reconnect manually
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError(err.message);
      reconnectAttempts.current++;
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      setConnected(true);
      setSocketId(newSocket.id);
      setError(null);
      reconnectAttempts.current = 0;
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Reconnection attempt', attemptNumber);
    });

    newSocket.on('reconnect_error', (err) => {
      console.error('Reconnection error:', err);
      reconnectAttempts.current++;
    });

    newSocket.on('reconnect_failed', () => {
      console.error('Reconnection failed after maximum attempts');
      setError('Failed to reconnect to server');
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [token, user]);

  // Event handler registration
  const on = (event: string, handler: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  };

  // Event handler removal
  const off = (event: string, handler?: (...args: any[]) => void) => {
    if (socketRef.current) {
      if (handler) {
        socketRef.current.off(event, handler);
      } else {
        socketRef.current.off(event);
      }
    }
  };

  // Game actions
  const requestMatchmaking = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('requestMatchmaking');
    } else {
      setError('Not connected to server');
    }
  };

  const cancelMatchmaking = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('cancelMatchmaking');
    } else {
      setError('Not connected to server');
    }
  };

  const createRoom = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('createRoom');
    } else {
      setError('Not connected to server');
    }
  };

  const joinRoom = (roomCode: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('joinRoom', { roomCode });
    } else {
      setError('Not connected to server');
    }
  };

  const makeMove = (
    gameId: string,
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('makeMove', {
        gameId,
        fromRow,
        fromCol,
        toRow,
        toCol,
      });
    } else {
      setError('Not connected to server');
    }
  };

  const startGame = (gameId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('startGame', { gameId });
    } else {
      setError('Not connected to server');
    }
  };

  const spectateGame = (gameId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('spectateGame', { gameId });
    } else {
      setError('Not connected to server');
    }
  };

  const leaveGame = (gameId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leaveGame', { gameId });
    } else {
      setError('Not connected to server');
    }
  };

  const requestGameState = (gameId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('requestGameState', { gameId });
    } else {
      setError('Not connected to server');
    }
  };

  const value: SocketContextType = {
    socket: socketRef.current,
    connected,
    socketId,
    error,
    on,
    off,
    requestMatchmaking,
    cancelMatchmaking,
    createRoom,
    joinRoom,
    makeMove,
    startGame,
    spectateGame,
    leaveGame,
    requestGameState,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

