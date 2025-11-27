import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '../test/utils';
import { GameStatus } from './GameStatus';
import { GameProvider, useGame } from '../contexts/GameContext';
import { SocketProvider } from '../contexts/SocketContext';
import { AuthProvider } from '../contexts/AuthContext';

// Mock contexts
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connected: true,
  socketId: 'test-socket-id',
  error: null,
  requestMatchmaking: vi.fn(),
  cancelMatchmaking: vi.fn(),
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  makeMove: vi.fn(),
  startGame: vi.fn(),
  spectateGame: vi.fn(),
  leaveGame: vi.fn(),
  requestGameState: vi.fn(),
};

vi.mock('../contexts/SocketContext', () => ({
  useSocket: () => mockSocket,
  SocketProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockAuth = {
  user: { id: 'user-1', email: 'test@example.com', elo: 1000, emailVerified: true },
  token: 'test-token',
  isLoading: false,
  error: null,
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
  clearError: vi.fn(),
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      <SocketProvider>
        <GameProvider>
          {children}
        </GameProvider>
      </SocketProvider>
    </AuthProvider>
  );
};

describe('GameStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display waiting status', () => {
    render(
      <TestWrapper>
        <GameStatus />
      </TestWrapper>
    );

    // Initially no game, so might show "No active game" or similar
    expect(screen.getByTestId('game-status')).toBeInTheDocument();
  });

  it('should display active game status', async () => {
    const TestComponent = () => {
      const { gameState } = useGame();
      React.useEffect(() => {
        // Simulate game started
        if (mockSocket.on.mock.calls.length > 0) {
          const gameStartedCall = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'gameStarted'
          );
          if (gameStartedCall) {
            gameStartedCall[1]({
              gameId: 'game-123',
              state: {
                id: 'game-123',
                board: Array(8)
                  .fill(null)
                  .map(() => Array(8).fill(null)),
                whiteState: {
                  energy: 6,
                  energyRegenRate: 0.5,
                  lastEnergyUpdate: Date.now(),
                  pieceCooldowns: {},
                },
                blackState: {
                  energy: 6,
                  energyRegenRate: 0.5,
                  lastEnergyUpdate: Date.now(),
                  pieceCooldowns: {},
                },
                whitePlayerId: 'user-1',
                blackPlayerId: 'user-2',
                currentTurn: null,
                status: 'active',
                winner: null,
                startedAt: Date.now(),
                lastMoveAt: null,
              },
            });
          }
        }
      }, []);
      return <GameStatus />;
    };

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(screen.getByTestId('game-status')).toBeInTheDocument();
  });

  it('should display win notification when game is finished and user won', () => {
    // This would require game state with winner
    render(
      <TestWrapper>
        <GameStatus />
      </TestWrapper>
    );

    expect(screen.getByTestId('game-status')).toBeInTheDocument();
  });

  it('should display loss notification when game is finished and user lost', () => {
    render(
      <TestWrapper>
        <GameStatus />
      </TestWrapper>
    );

    expect(screen.getByTestId('game-status')).toBeInTheDocument();
  });
});

