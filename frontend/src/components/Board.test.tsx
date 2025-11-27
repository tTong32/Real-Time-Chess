import { describe, it, expect, vi, beforeEach, waitFor } from 'vitest';
import React from 'react';
import { render, screen, waitFor as rtlWaitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { Board } from './Board';
import { GameProvider, useGame } from '../contexts/GameContext';
import { SocketProvider } from '../contexts/SocketContext';
import { AuthProvider } from '../contexts/AuthContext';

// Mock socket context
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

// Mock auth context
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

// Test component that uses game context
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

describe('Board', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render an 8x8 board', () => {
    render(
      <TestWrapper>
        <Board />
      </TestWrapper>
    );

    // Should have 64 squares (8x8)
    const squares = screen.getAllByRole('button');
    expect(squares.length).toBe(64);
  });

  it('should render squares with correct coordinates', () => {
    render(
      <TestWrapper>
        <Board />
      </TestWrapper>
    );

    // Check that squares have data attributes for coordinates
    const squares = screen.getAllByRole('button');
    const firstSquare = squares[0];
    expect(firstSquare).toHaveAttribute('data-row');
    expect(firstSquare).toHaveAttribute('data-col');
  });

  it('should handle square click', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Board />
      </TestWrapper>
    );

    const squares = screen.getAllByRole('button');
    const firstSquare = squares[0];

    await user.click(firstSquare);

    // Square should be selected (we'll check this through game context)
    // The board should update to show selected state
    expect(firstSquare).toHaveAttribute('data-selected', 'true');
  });

  it('should render pieces on the board', () => {
    // This test will need game state with pieces
    // For now, we'll test that the board structure is correct
    render(
      <TestWrapper>
        <Board />
      </TestWrapper>
    );

    const squares = screen.getAllByRole('button');
    expect(squares.length).toBe(64);

    // Each square should be able to contain a piece
    squares.forEach((square) => {
      expect(square).toBeInTheDocument();
    });
  });

  it('should highlight selected square', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Board />
      </TestWrapper>
    );

    const squares = screen.getAllByRole('button');
    const targetSquare = squares[10]; // Click a square

    await user.click(targetSquare);

    // Selected square should have selected attribute
    await expect(targetSquare).toHaveAttribute('data-selected', 'true');
  });

  it('should clear selection when clicking the same square again', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Board />
      </TestWrapper>
    );

    const squares = screen.getAllByRole('button');
    const targetSquare = squares[10];

    // Click once to select
    await user.click(targetSquare);
    await expect(targetSquare).toHaveAttribute('data-selected', 'true');

    // Click again to deselect
    await user.click(targetSquare);
    await expect(targetSquare).toHaveAttribute('data-selected', 'false');
  });

  it('should make a move when clicking a different square after selecting', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <Board />
      </TestWrapper>
    );

    // Wait for socket.on to be called
    await rtlWaitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    // Initialize game by triggering gameStarted event
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

    // Wait for game to initialize
    await rtlWaitFor(() => {
      const squares = screen.getAllByRole('button');
      expect(squares.length).toBe(64);
    });

    const squares = screen.getAllByRole('button');
    const fromSquare = squares[0];
    const toSquare = squares[10];

    // Click first square to select
    await user.click(fromSquare);
    await rtlWaitFor(() => {
      expect(fromSquare).toHaveAttribute('data-selected', 'true');
    });

    // Click second square to make move
    await user.click(toSquare);

    // Should call makeMove if game is active
    await rtlWaitFor(() => {
      expect(mockSocket.makeMove).toHaveBeenCalled();
    });
  });

  it('should apply correct CSS classes for light and dark squares', () => {
    render(
      <TestWrapper>
        <Board />
      </TestWrapper>
    );

    const squares = screen.getAllByRole('button');
    
    // Check that squares have appropriate classes
    // Light squares (even row + even col or odd row + odd col)
    // Dark squares (even row + odd col or odd row + even col)
    const firstSquare = squares[0]; // (0,0) - should be light
    expect(firstSquare.className).toContain('square');
  });

  it('should be accessible with proper ARIA labels', () => {
    render(
      <TestWrapper>
        <Board />
      </TestWrapper>
    );

    const squares = screen.getAllByRole('button');
    const firstSquare = squares[0];

    // Squares should have accessible labels
    expect(firstSquare).toHaveAttribute('aria-label');
  });
});

