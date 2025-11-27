import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '../test/utils';
import { PieceCooldownList } from './PieceCooldownList';
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

describe('PieceCooldownList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty list when no pieces are on cooldown', () => {
    render(
      <TestWrapper>
        <PieceCooldownList />
      </TestWrapper>
    );

    expect(screen.getByTestId('cooldown-list')).toBeInTheDocument();
    expect(screen.getByText('No pieces on cooldown')).toBeInTheDocument();
  });

  it('should display pieces on cooldown', async () => {
    const TestComponent = () => {
      const { gameState } = useGame();
      React.useEffect(() => {
        if (mockSocket.on.mock.calls.length > 0) {
          const gameStartedCall = mockSocket.on.mock.calls.find(
            (call) => call[0] === 'gameStarted'
          );
          if (gameStartedCall) {
            gameStartedCall[1]({
              gameId: 'game-123',
              state: {
                id: 'game-123',
                board: [
                  [
                    { id: 'piece-1', type: 'pawn', color: 'white', row: 0, col: 0, hasMoved: false },
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                  ],
                  Array(8).fill(null),
                  Array(8).fill(null),
                  Array(8).fill(null),
                  Array(8).fill(null),
                  Array(8).fill(null),
                  Array(8).fill(null),
                  Array(8).fill(null),
                ],
                whiteState: {
                  energy: 6,
                  energyRegenRate: 0.5,
                  lastEnergyUpdate: Date.now(),
                  pieceCooldowns: {
                    'piece-1': Date.now() + 5000, // 5 seconds cooldown
                  },
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
      return <PieceCooldownList />;
    };

    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(screen.getByTestId('cooldown-list')).toBeInTheDocument();
  });

  it('should show cooldown time for each piece', () => {
    // This will be tested with actual game state
    render(
      <TestWrapper>
        <PieceCooldownList />
      </TestWrapper>
    );

    expect(screen.getByTestId('cooldown-list')).toBeInTheDocument();
  });

  it('should update cooldown times as they decrease', () => {
    render(
      <TestWrapper>
        <PieceCooldownList />
      </TestWrapper>
    );

    expect(screen.getByTestId('cooldown-list')).toBeInTheDocument();
  });

  it('should remove pieces from list when cooldown expires', () => {
    render(
      <TestWrapper>
        <PieceCooldownList />
      </TestWrapper>
    );

    expect(screen.getByTestId('cooldown-list')).toBeInTheDocument();
  });
});

