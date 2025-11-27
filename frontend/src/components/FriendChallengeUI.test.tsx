import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { FriendChallengeUI } from './FriendChallengeUI';
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
        {children}
      </SocketProvider>
    </AuthProvider>
  );
};

describe('FriendChallengeUI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.on.mockClear();
  });

  it('should render create room button', () => {
    render(
      <TestWrapper>
        <FriendChallengeUI />
      </TestWrapper>
    );

    expect(screen.getByRole('button', { name: /create room/i })).toBeInTheDocument();
  });

  it('should create room when button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <FriendChallengeUI />
      </TestWrapper>
    );

    const createButton = screen.getByRole('button', { name: /create room/i });
    await user.click(createButton);

    expect(mockSocket.createRoom).toHaveBeenCalled();
  });

  it('should display room code when room is created', async () => {
    render(
      <TestWrapper>
        <FriendChallengeUI />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    // Simulate roomCreated event
    const roomCreatedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'roomCreated'
    );
    if (roomCreatedCall) {
      roomCreatedCall[1]({ roomCode: 'ABC123' });
    }

    await waitFor(() => {
      expect(screen.getByText(/ABC123/)).toBeInTheDocument();
      expect(screen.getByText(/share this code/i)).toBeInTheDocument();
    });
  });

  it('should show waiting message when room is created', async () => {
    render(
      <TestWrapper>
        <FriendChallengeUI />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    // Simulate roomCreated
    const roomCreatedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'roomCreated'
    );
    if (roomCreatedCall) {
      roomCreatedCall[1]({ roomCode: 'ABC123' });
    }

    await waitFor(() => {
      expect(screen.getByText(/waiting for player/i)).toBeInTheDocument();
    });
  });

  it('should handle playerJoined event', async () => {
    render(
      <TestWrapper>
        <FriendChallengeUI />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    // First create a room
    const roomCreatedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'roomCreated'
    );
    if (roomCreatedCall) {
      roomCreatedCall[1]({ roomCode: 'ABC123' });
    }

    await waitFor(() => {
      expect(screen.getByText(/ABC123/)).toBeInTheDocument();
    });

    // Simulate playerJoined event
    const playerJoinedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'playerJoined'
    );
    if (playerJoinedCall) {
      playerJoinedCall[1]({ gameId: 'game-123', userId: 'user-2' });
    }

    await waitFor(() => {
      expect(screen.getByText(/player joined/i)).toBeInTheDocument();
    });
  });

  it('should show start game button when both players are in room', async () => {
    render(
      <TestWrapper>
        <FriendChallengeUI />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    // First create a room
    const roomCreatedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'roomCreated'
    );
    if (roomCreatedCall) {
      roomCreatedCall[1]({ roomCode: 'ABC123' });
    }

    await waitFor(() => {
      expect(screen.getByText(/ABC123/)).toBeInTheDocument();
    });

    // Then simulate playerJoined
    const playerJoinedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'playerJoined'
    );
    if (playerJoinedCall) {
      playerJoinedCall[1]({ gameId: 'game-123', userId: 'user-2' });
    }

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument();
    });
  });

  it('should handle roomError event', async () => {
    render(
      <TestWrapper>
        <FriendChallengeUI />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    // Simulate roomError
    const roomErrorCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'roomError'
    );
    if (roomErrorCall) {
      roomErrorCall[1]({ error: 'Failed to create room' });
    }

    await waitFor(() => {
      expect(screen.getByText(/failed to create room/i)).toBeInTheDocument();
    });
  });
});

