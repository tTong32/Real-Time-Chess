import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { GameProvider, useGame } from './GameContext';
import { SocketProvider, useSocket } from './SocketContext';
import { AuthProvider, useAuth } from './AuthContext';

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

vi.mock('./SocketContext', () => ({
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

vi.mock('./AuthContext', () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Test component
const TestComponent = () => {
  const game = useGame();

  return (
    <div>
      <div data-testid="game-id">{game.gameId || 'null'}</div>
      <div data-testid="game-status">{game.gameState?.status || 'null'}</div>
      <div data-testid="is-white">
        {game.isWhitePlayer !== null ? game.isWhitePlayer.toString() : 'null'}
      </div>
      <div data-testid="board-rows">{game.gameState?.board?.length || 0}</div>
      <div data-testid="white-energy">
        {game.gameState?.whiteState?.energy ?? 'null'}
      </div>
      <div data-testid="black-energy">
        {game.gameState?.blackState?.energy ?? 'null'}
      </div>
      <div data-testid="selected-square">
        {game.selectedSquare
          ? `${game.selectedSquare.row},${game.selectedSquare.col}`
          : 'null'}
      </div>
      <div data-testid="error">{game.error || 'null'}</div>
      <button
        onClick={() => game.selectSquare(0, 0)}
        data-testid="select-square"
      >
        Select Square
      </button>
      <button
        onClick={() => game.clearSelection()}
        data-testid="clear-selection"
      >
        Clear Selection
      </button>
      <button
        onClick={() => game.makeMove(0, 0, 1, 1)}
        data-testid="make-move"
      >
        Make Move
      </button>
      <button
        onClick={() => game.handleSquareClick(2, 3)}
        data-testid="handle-square-click"
      >
        Handle Square Click
      </button>
    </div>
  );
};

const mockGameState = {
  id: 'game-123',
  board: Array(8)
    .fill(null)
    .map(() => Array(8).fill(null)),
  whiteState: {
    energy: 6,
    energyRegenRate: 0.5,
    lastEnergyUpdate: Date.now(),
    pieceCooldowns: new Map(),
  },
  blackState: {
    energy: 6,
    energyRegenRate: 0.5,
    lastEnergyUpdate: Date.now(),
    pieceCooldowns: new Map(),
  },
  whitePlayerId: 'user-1',
  blackPlayerId: 'user-2',
  currentTurn: null,
  status: 'active' as const,
  winner: null,
  startedAt: Date.now(),
  lastMoveAt: null,
};

describe('GameContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.emit.mockClear();
  });

  it('should provide initial state with no game', () => {
    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    expect(screen.getByTestId('game-id')).toHaveTextContent('null');
    expect(screen.getByTestId('game-status')).toHaveTextContent('null');
    expect(screen.getByTestId('is-white')).toHaveTextContent('null');
  });

  it('should initialize game state when gameStarted event is received', async () => {
    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    // Wait for socket.on to be called
    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    // Find the gameStarted handler
    const gameStartedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'gameStarted'
    );
    expect(gameStartedCall).toBeDefined();

    const gameStartedHandler = gameStartedCall![1];
    gameStartedHandler({
      gameId: 'game-123',
      state: mockGameState,
    });

    await waitFor(() => {
      expect(screen.getByTestId('game-id')).toHaveTextContent('game-123');
      expect(screen.getByTestId('game-status')).toHaveTextContent('active');
    });
  });

  it('should update game state when gameStateUpdate event is received', async () => {
    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    // Initialize game first
    const gameStartedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'gameStarted'
    );
    if (gameStartedCall) {
      gameStartedCall[1]({
        gameId: 'game-123',
        state: mockGameState,
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId('game-id')).toHaveTextContent('game-123');
    });

    // Find gameStateUpdate handler
    const updateCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'gameStateUpdate'
    );
    expect(updateCall).toBeDefined();

    const updatedState = {
      ...mockGameState,
      whiteState: {
        ...mockGameState.whiteState,
        energy: 8,
      },
    };

    const updateHandler = updateCall![1];
    updateHandler(updatedState);

    await waitFor(() => {
      expect(screen.getByTestId('white-energy')).toHaveTextContent('8');
    });
  });

  it('should determine if current user is white player', async () => {
    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    const gameStartedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'gameStarted'
    );
    if (gameStartedCall) {
      gameStartedCall[1]({
        gameId: 'game-123',
        state: mockGameState,
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId('is-white')).toHaveTextContent('true');
    });
  });

  it('should determine if current user is black player', async () => {
    const blackGameState = {
      ...mockGameState,
      whitePlayerId: 'user-2',
      blackPlayerId: 'user-1',
    };

    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    const gameStartedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'gameStarted'
    );
    if (gameStartedCall) {
      gameStartedCall[1]({
        gameId: 'game-123',
        state: blackGameState,
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId('is-white')).toHaveTextContent('false');
    });
  });

  it('should handle square selection', async () => {
    const user = userEvent.setup();

    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    const selectButton = screen.getByTestId('select-square');
    await user.click(selectButton);

    await waitFor(() => {
      expect(screen.getByTestId('selected-square')).toHaveTextContent('0,0');
    });
  });

  it('should clear selection', async () => {
    const user = userEvent.setup();

    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    // Select a square first
    const selectButton = screen.getByTestId('select-square');
    await user.click(selectButton);

    await waitFor(() => {
      expect(screen.getByTestId('selected-square')).toHaveTextContent('0,0');
    });

    // Clear selection
    const clearButton = screen.getByTestId('clear-selection');
    await user.click(clearButton);

    await waitFor(() => {
      expect(screen.getByTestId('selected-square')).toHaveTextContent('null');
    });
  });

  it('should handle square click - select square when none selected', async () => {
    const user = userEvent.setup();

    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    const handleClickButton = screen.getByTestId('handle-square-click');
    await user.click(handleClickButton);

    await waitFor(() => {
      expect(screen.getByTestId('selected-square')).toHaveTextContent('2,3');
    });
  });

  it('should handle square click - make move when square is selected', async () => {
    const user = userEvent.setup();

    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    // Initialize game
    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    const gameStartedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'gameStarted'
    );
    if (gameStartedCall) {
      gameStartedCall[1]({
        gameId: 'game-123',
        state: mockGameState,
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId('game-id')).toHaveTextContent('game-123');
    });

    // Select a square first
    const selectButton = screen.getByTestId('select-square');
    await user.click(selectButton);

    await waitFor(() => {
      expect(screen.getByTestId('selected-square')).toHaveTextContent('0,0');
    });

    // Click another square to make a move
    const handleClickButton = screen.getByTestId('handle-square-click');
    await user.click(handleClickButton);

    await waitFor(() => {
      expect(mockSocket.makeMove).toHaveBeenCalledWith('game-123', 0, 0, 2, 3);
    });
  });

  it('should handle moveAccepted event', async () => {
    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    // Initialize game
    const gameStartedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'gameStarted'
    );
    if (gameStartedCall) {
      gameStartedCall[1]({
        gameId: 'game-123',
        state: mockGameState,
      });
    }

    // Find moveAccepted handler
    const moveAcceptedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'moveAccepted'
    );
    expect(moveAcceptedCall).toBeDefined();

    const moveAcceptedHandler = moveAcceptedCall![1];
    moveAcceptedHandler({
      move: {
        fromRow: 0,
        fromCol: 0,
        toRow: 1,
        toCol: 1,
      },
    });

    // Selection should be cleared after move is accepted
    await waitFor(() => {
      expect(screen.getByTestId('selected-square')).toHaveTextContent('null');
    });
  });

  it('should handle moveRejected event', async () => {
    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    // Find moveRejected handler
    const moveRejectedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'moveRejected'
    );
    expect(moveRejectedCall).toBeDefined();

    const moveRejectedHandler = moveRejectedCall![1];
    moveRejectedHandler({
      reason: 'Invalid move',
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Invalid move');
    });
  });

  it('should handle gameEnded event', async () => {
    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    // Initialize game
    const gameStartedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'gameStarted'
    );
    if (gameStartedCall) {
      gameStartedCall[1]({
        gameId: 'game-123',
        state: mockGameState,
      });
    }

    // Find gameEnded handler
    const gameEndedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'gameEnded'
    );
    expect(gameEndedCall).toBeDefined();

    const gameEndedHandler = gameEndedCall![1];
    const finishedState = {
      ...mockGameState,
      status: 'finished' as const,
      winner: 'white' as const,
    };

    gameEndedHandler({
      gameId: 'game-123',
      winner: 'white',
      state: finishedState,
    });

    await waitFor(() => {
      expect(screen.getByTestId('game-status')).toHaveTextContent('finished');
    });
  });

  it('should call socket.makeMove when makeMove is called', async () => {
    const user = userEvent.setup();

    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    // Initialize game
    const gameStartedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'gameStarted'
    );
    if (gameStartedCall) {
      gameStartedCall[1]({
        gameId: 'game-123',
        state: mockGameState,
      });
    }

    await waitFor(() => {
      expect(screen.getByTestId('game-id')).toHaveTextContent('game-123');
    });

    const makeMoveButton = screen.getByTestId('make-move');
    await user.click(makeMoveButton);

    await waitFor(() => {
      expect(mockSocket.makeMove).toHaveBeenCalledWith('game-123', 0, 0, 1, 1);
    });
  });

  it('should not make move if no game is active', async () => {
    const user = userEvent.setup();

    render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    const makeMoveButton = screen.getByTestId('make-move');
    await user.click(makeMoveButton);

    // Should not call makeMove if no game
    expect(mockSocket.makeMove).not.toHaveBeenCalled();
  });

  it('should cleanup event listeners on unmount', () => {
    const { unmount } = render(
      <GameProvider>
        <TestComponent />
      </GameProvider>
    );

    unmount();

    // Should have called off for all registered events
    expect(mockSocket.off).toHaveBeenCalled();
  });
});

