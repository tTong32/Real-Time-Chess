import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { SocketProvider, useSocket } from './SocketContext';
import { AuthProvider, useAuth } from './AuthContext';

// Store mock socket globally for test access
let globalMockSocket: any = null;

// Mock socket.io-client
vi.mock('socket.io-client', () => {
  const createMockSocket = () => {
    const handlers: Record<string, any[]> = {};
    
    const socket: any = {
      connect: vi.fn(() => {
        socket.connected = true;
        // Trigger connect event
        const connectHandlers = handlers['connect'] || [];
        connectHandlers.forEach((handler) => handler());
      }),
      disconnect: vi.fn(() => {
        socket.connected = false;
        // Trigger disconnect event
        const disconnectHandlers = handlers['disconnect'] || [];
        disconnectHandlers.forEach((handler) => handler('io client disconnect'));
      }),
      on: vi.fn((event: string, handler: any) => {
        if (!handlers[event]) {
          handlers[event] = [];
        }
        handlers[event].push(handler);
      }),
      off: vi.fn((event: string, handler?: any) => {
        if (handlers[event]) {
          if (handler) {
            handlers[event] = handlers[event].filter((h) => h !== handler);
          } else {
            handlers[event] = [];
          }
        }
      }),
      emit: vi.fn(),
      connected: false,
      id: 'mock-socket-id',
      auth: {},
      _handlers: handlers,
    };
    
    return socket;
  };

  const mockIo = vi.fn(() => {
    globalMockSocket = createMockSocket();
    // Auto-connect after handlers are registered
    // Use setTimeout with 0 to allow event handlers to be registered first
    setTimeout(() => {
      if (globalMockSocket && !globalMockSocket.connected) {
        globalMockSocket.connected = true;
        globalMockSocket.id = 'mock-socket-id';
        const connectHandlers = globalMockSocket._handlers['connect'] || [];
        connectHandlers.forEach((handler: any) => {
          try {
            handler();
          } catch (e) {
            // Ignore errors in handlers during test setup
          }
        });
      }
    }, 0);
    return globalMockSocket;
  });

  return {
    io: mockIo,
  };
});

// Test component that uses both contexts
const TestComponent = () => {
  const socket = useSocket();
  const auth = useAuth();

  return (
    <div>
      <div data-testid="connected">{socket.connected ? 'true' : 'false'}</div>
      <div data-testid="socket-id">{socket.socketId || 'null'}</div>
      <div data-testid="error">{socket.error || 'null'}</div>
      <button
        onClick={() => socket.requestMatchmaking()}
        data-testid="request-matchmaking"
      >
        Request Matchmaking
      </button>
      <button
        onClick={() => socket.cancelMatchmaking()}
        data-testid="cancel-matchmaking"
      >
        Cancel Matchmaking
      </button>
      <button
        onClick={() => socket.createRoom()}
        data-testid="create-room"
      >
        Create Room
      </button>
      <button
        onClick={() => socket.joinRoom('TEST123')}
        data-testid="join-room"
      >
        Join Room
      </button>
      <button
        onClick={() => socket.makeMove('game-id', 0, 0, 1, 1)}
        data-testid="make-move"
      >
        Make Move
      </button>
      <button
        onClick={() => socket.startGame('game-id')}
        data-testid="start-game"
      >
        Start Game
      </button>
      <button
        onClick={() => socket.spectateGame('game-id')}
        data-testid="spectate-game"
      >
        Spectate Game
      </button>
      <button
        onClick={() => socket.leaveGame('game-id')}
        data-testid="leave-game"
      >
        Leave Game
      </button>
      <button
        onClick={() => socket.requestGameState('game-id')}
        data-testid="request-game-state"
      >
        Request Game State
      </button>
      {auth.token && (
        <div data-testid="has-token">has-token</div>
      )}
    </div>
  );
};

describe('SocketContext', () => {
  let mockSocket: any;
  let mockIo: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    const socketIoClient = await import('socket.io-client');
    mockIo = vi.mocked(socketIoClient.io);
    mockSocket = globalMockSocket;
    mockIo.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not connect when user is not authenticated', async () => {
    render(
      <AuthProvider>
        <SocketProvider>
          <TestComponent />
        </SocketProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('false');
    });

    // Should not have called io() to create socket
    const { io } = await import('socket.io-client');
    expect(io).not.toHaveBeenCalled();
  });

  it('should connect when user is authenticated', async () => {
    const mockUser = { id: '1', email: 'test@example.com', elo: 1000, emailVerified: true };
    const mockToken = 'mock-token';

    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    render(
      <AuthProvider>
        <SocketProvider>
          <TestComponent />
        </SocketProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-token')).toBeInTheDocument();
    });

    // Wait for socket connection (mock connects via Promise.resolve)
    await waitFor(() => {
      expect(mockIo).toHaveBeenCalled();
      expect(screen.getByTestId('connected')).toHaveTextContent('true');
    }, { timeout: 2000 });
  });

  it('should disconnect when user logs out', async () => {
    const mockUser = { id: '1', email: 'test@example.com', elo: 1000, emailVerified: true };
    const mockToken = 'mock-token';

    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    const TestWithLogout = () => {
      const socket = useSocket();
      const auth = useAuth();

      return (
        <div>
          <div data-testid="connected">{socket.connected ? 'true' : 'false'}</div>
          {auth.token && (
            <div data-testid="has-token">has-token</div>
          )}
          <button onClick={auth.logout} data-testid="logout">Logout</button>
        </div>
      );
    };

    render(
      <AuthProvider>
        <SocketProvider>
          <TestWithLogout />
        </SocketProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-token')).toBeInTheDocument();
    });

    // Wait for socket to connect first
    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('true');
    }, { timeout: 2000 });

    // Simulate logout
    const user = userEvent.setup();
    const logoutButton = screen.getByTestId('logout');
    await user.click(logoutButton);

    const currentSocket = globalMockSocket;

    await waitFor(() => {
      expect(currentSocket.disconnect).toHaveBeenCalled();
    });
  });

  it('should emit requestMatchmaking event', async () => {
    const mockUser = { id: '1', email: 'test@example.com', elo: 1000, emailVerified: true };
    const mockToken = 'mock-token';

    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });


    render(
      <AuthProvider>
        <SocketProvider>
          <TestComponent />
        </SocketProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-token')).toBeInTheDocument();
    });

    // Wait for socket to connect
    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('true');
    }, { timeout: 2000 });

    // Wait a bit more to ensure socket is fully ready
    await new Promise(resolve => setTimeout(resolve, 50));

    const user = userEvent.setup();
    const button = screen.getByTestId('request-matchmaking');
    await user.click(button);

    // Get the current mock socket (it might have been recreated)
    const currentSocket = globalMockSocket;
    
    await waitFor(() => {
      expect(currentSocket.emit).toHaveBeenCalledWith('requestMatchmaking');
    });
  });

  it('should emit cancelMatchmaking event', async () => {
    const mockUser = { id: '1', email: 'test@example.com', elo: 1000, emailVerified: true };
    const mockToken = 'mock-token';

    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    render(
      <AuthProvider>
        <SocketProvider>
          <TestComponent />
        </SocketProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-token')).toBeInTheDocument();
    });

    // Wait for socket to connect
    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('true');
    }, { timeout: 2000 });

    // Wait a bit more to ensure socket is fully ready
    await new Promise(resolve => setTimeout(resolve, 50));

    const user = userEvent.setup();
    const button = screen.getByTestId('cancel-matchmaking');
    await user.click(button);

    const currentSocket = globalMockSocket;
    
    await waitFor(() => {
      expect(currentSocket.emit).toHaveBeenCalledWith('cancelMatchmaking');
    });
  });

  it('should emit createRoom event', async () => {
    const mockUser = { id: '1', email: 'test@example.com', elo: 1000, emailVerified: true };
    const mockToken = 'mock-token';

    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });


    render(
      <AuthProvider>
        <SocketProvider>
          <TestComponent />
        </SocketProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-token')).toBeInTheDocument();
    });

    // Wait for socket to connect
    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('true');
    }, { timeout: 2000 });

    // Wait a bit more to ensure socket is fully ready
    await new Promise(resolve => setTimeout(resolve, 50));

    const user = userEvent.setup();
    const button = screen.getByTestId('create-room');
    await user.click(button);

    const currentSocket = globalMockSocket;

    await waitFor(() => {
      expect(currentSocket.emit).toHaveBeenCalledWith('createRoom');
    });
  });

  it('should emit joinRoom event with room code', async () => {
    const mockUser = { id: '1', email: 'test@example.com', elo: 1000, emailVerified: true };
    const mockToken = 'mock-token';

    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });


    render(
      <AuthProvider>
        <SocketProvider>
          <TestComponent />
        </SocketProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-token')).toBeInTheDocument();
    });

    // Wait for socket to connect
    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('true');
    }, { timeout: 2000 });

    // Wait a bit more to ensure socket is fully ready
    await new Promise(resolve => setTimeout(resolve, 50));

    const user = userEvent.setup();
    const button = screen.getByTestId('join-room');
    await user.click(button);

    const currentSocket = globalMockSocket;

    await waitFor(() => {
      expect(currentSocket.emit).toHaveBeenCalledWith('joinRoom', { roomCode: 'TEST123' });
    });
  });

  it('should emit makeMove event with correct parameters', async () => {
    const mockUser = { id: '1', email: 'test@example.com', elo: 1000, emailVerified: true };
    const mockToken = 'mock-token';

    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });


    render(
      <AuthProvider>
        <SocketProvider>
          <TestComponent />
        </SocketProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-token')).toBeInTheDocument();
    });

    // Wait for socket to connect
    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('true');
    }, { timeout: 2000 });

    // Wait a bit more to ensure socket is fully ready
    await new Promise(resolve => setTimeout(resolve, 50));

    const user = userEvent.setup();
    const button = screen.getByTestId('make-move');
    await user.click(button);

    const currentSocket = globalMockSocket;

    await waitFor(() => {
      expect(currentSocket.emit).toHaveBeenCalledWith('makeMove', {
        gameId: 'game-id',
        fromRow: 0,
        fromCol: 0,
        toRow: 1,
        toCol: 1,
      });
    });
  });

  it('should emit startGame event', async () => {
    const mockUser = { id: '1', email: 'test@example.com', elo: 1000, emailVerified: true };
    const mockToken = 'mock-token';

    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });


    render(
      <AuthProvider>
        <SocketProvider>
          <TestComponent />
        </SocketProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-token')).toBeInTheDocument();
    });

    // Wait for socket to connect
    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('true');
    }, { timeout: 2000 });

    // Wait a bit more to ensure socket is fully ready
    await new Promise(resolve => setTimeout(resolve, 50));

    const user = userEvent.setup();
    const button = screen.getByTestId('start-game');
    await user.click(button);

    const currentSocket = globalMockSocket;

    await waitFor(() => {
      expect(currentSocket.emit).toHaveBeenCalledWith('startGame', { gameId: 'game-id' });
    });
  });

  it('should emit spectateGame event', async () => {
    const mockUser = { id: '1', email: 'test@example.com', elo: 1000, emailVerified: true };
    const mockToken = 'mock-token';

    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });


    render(
      <AuthProvider>
        <SocketProvider>
          <TestComponent />
        </SocketProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-token')).toBeInTheDocument();
    });

    // Wait for socket to connect
    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('true');
    }, { timeout: 2000 });

    // Wait a bit more to ensure socket is fully ready
    await new Promise(resolve => setTimeout(resolve, 50));

    const user = userEvent.setup();
    const button = screen.getByTestId('spectate-game');
    await user.click(button);

    const currentSocket = globalMockSocket;

    await waitFor(() => {
      expect(currentSocket.emit).toHaveBeenCalledWith('spectateGame', { gameId: 'game-id' });
    });
  });

  it('should emit leaveGame event', async () => {
    const mockUser = { id: '1', email: 'test@example.com', elo: 1000, emailVerified: true };
    const mockToken = 'mock-token';

    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });


    render(
      <AuthProvider>
        <SocketProvider>
          <TestComponent />
        </SocketProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-token')).toBeInTheDocument();
    });

    // Wait for socket to connect
    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('true');
    }, { timeout: 2000 });

    // Wait a bit more to ensure socket is fully ready
    await new Promise(resolve => setTimeout(resolve, 50));

    const user = userEvent.setup();
    const button = screen.getByTestId('leave-game');
    await user.click(button);

    const currentSocket = globalMockSocket;

    await waitFor(() => {
      expect(currentSocket.emit).toHaveBeenCalledWith('leaveGame', { gameId: 'game-id' });
    });
  });

  it('should emit requestGameState event', async () => {
    const mockUser = { id: '1', email: 'test@example.com', elo: 1000, emailVerified: true };
    const mockToken = 'mock-token';

    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });


    render(
      <AuthProvider>
        <SocketProvider>
          <TestComponent />
        </SocketProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-token')).toBeInTheDocument();
    });

    // Wait for socket to connect
    await waitFor(() => {
      expect(screen.getByTestId('connected')).toHaveTextContent('true');
    }, { timeout: 2000 });

    // Wait a bit more to ensure socket is fully ready
    await new Promise(resolve => setTimeout(resolve, 50));

    const user = userEvent.setup();
    const button = screen.getByTestId('request-game-state');
    await user.click(button);

    const currentSocket = globalMockSocket;

    await waitFor(() => {
      expect(currentSocket.emit).toHaveBeenCalledWith('requestGameState', { gameId: 'game-id' });
    });
  });

  it('should handle matchFound event', async () => {
    const mockUser = { id: '1', email: 'test@example.com', elo: 1000, emailVerified: true };
    const mockToken = 'mock-token';

    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });


    const TestWithMatchFound = () => {
      const socket = useSocket();
      const auth = useAuth();
      const [matchFound, setMatchFound] = React.useState(false);

      React.useEffect(() => {
        const handler = (data: { gameId: string }) => {
          setMatchFound(true);
        };
        socket.on?.('matchFound', handler);
        return () => socket.off?.('matchFound', handler);
      }, [socket]);

      return (
        <div>
          <div data-testid="match-found">{matchFound ? 'true' : 'false'}</div>
          {auth.token && (
            <div data-testid="has-token">has-token</div>
          )}
        </div>
      );
    };

    render(
      <AuthProvider>
        <SocketProvider>
          <TestWithMatchFound />
        </SocketProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-token')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('has-token')).toBeInTheDocument();
    });

    // Wait for socket to connect
    await waitFor(() => {
      expect(screen.getByTestId('has-token')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Wait a bit more for socket connection to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate matchFound event - find the handler from the socket's internal handlers
    const currentSocket = globalMockSocket;
    const matchFoundHandlers = currentSocket._handlers['matchFound'] || [];
    if (matchFoundHandlers.length > 0) {
      matchFoundHandlers[0]({ gameId: 'game-123' });
    }

    await waitFor(() => {
      expect(screen.getByTestId('match-found')).toHaveTextContent('true');
    });
  });

  it('should handle reconnection', async () => {
    const mockUser = { id: '1', email: 'test@example.com', elo: 1000, emailVerified: true };
    const mockToken = 'mock-token';

    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    mockSocket.connected = false;

    render(
      <AuthProvider>
        <SocketProvider>
          <TestComponent />
        </SocketProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('has-token')).toBeInTheDocument();
    });

    // Wait for socket to be created and connected
    await waitFor(() => {
      expect(mockIo).toHaveBeenCalled();
      expect(screen.getByTestId('connected')).toHaveTextContent('true');
    }, { timeout: 2000 });

    // Simulate disconnect
    const currentSocket = globalMockSocket;
    const disconnectHandlers = currentSocket._handlers['disconnect'] || [];
    if (disconnectHandlers.length > 0) {
      disconnectHandlers[0]('io server disconnect');
    }

    // Socket.io should handle reconnection automatically, but we can verify
    // that the socket was created with reconnection enabled
    expect(mockIo).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        reconnection: true,
      })
    );
  });
});

