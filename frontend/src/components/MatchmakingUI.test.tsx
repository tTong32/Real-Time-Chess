import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { MatchmakingUI } from './MatchmakingUI';
import { SocketProvider, useSocket } from '../contexts/SocketContext';
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

describe('MatchmakingUI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
  });

  it('should render matchmaking button when not in queue', () => {
    render(
      <TestWrapper>
        <MatchmakingUI />
      </TestWrapper>
    );

    expect(screen.getByRole('button', { name: /find match/i })).toBeInTheDocument();
  });

  it('should start matchmaking when button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <MatchmakingUI />
      </TestWrapper>
    );

    const findMatchButton = screen.getByRole('button', { name: /find match/i });
    await user.click(findMatchButton);

    expect(mockSocket.requestMatchmaking).toHaveBeenCalled();
  });

  it('should show loading state when matchmaking starts', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <MatchmakingUI />
      </TestWrapper>
    );

    // Wait for socket.on to be called
    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    const findMatchButton = screen.getByRole('button', { name: /find match/i });
    await user.click(findMatchButton);

    // Simulate matchmakingStarted event
    const matchmakingStartedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'matchmakingStarted'
    );
    if (matchmakingStartedCall) {
      matchmakingStartedCall[1]({ queueSize: 1 });
    }

    await waitFor(() => {
      expect(screen.getByText(/searching/i)).toBeInTheDocument();
    });
  });

  it('should show cancel button when in queue', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <MatchmakingUI />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    const findMatchButton = screen.getByRole('button', { name: /find match/i });
    await user.click(findMatchButton);

    // Simulate matchmakingStarted
    const matchmakingStartedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'matchmakingStarted'
    );
    if (matchmakingStartedCall) {
      matchmakingStartedCall[1]({ queueSize: 1 });
    }

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  it('should cancel matchmaking when cancel button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <MatchmakingUI />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    // Start matchmaking
    const findMatchButton = screen.getByRole('button', { name: /find match/i });
    await user.click(findMatchButton);

    // Simulate matchmakingStarted
    const matchmakingStartedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'matchmakingStarted'
    );
    if (matchmakingStartedCall) {
      matchmakingStartedCall[1]({ queueSize: 1 });
    }

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    // Cancel matchmaking
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockSocket.cancelMatchmaking).toHaveBeenCalled();
  });

  it('should display queue size when in queue', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <MatchmakingUI />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    const findMatchButton = screen.getByRole('button', { name: /find match/i });
    await user.click(findMatchButton);

    // Simulate matchmakingStarted with queue size
    const matchmakingStartedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'matchmakingStarted'
    );
    if (matchmakingStartedCall) {
      matchmakingStartedCall[1]({ queueSize: 3 });
    }

    await waitFor(() => {
      expect(screen.getByText(/3.*players/i)).toBeInTheDocument();
    });
  });

  it('should handle matchFound event', async () => {
    render(
      <TestWrapper>
        <MatchmakingUI />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    // Simulate matchFound event
    const matchFoundCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'matchFound'
    );
    if (matchFoundCall) {
      matchFoundCall[1]({ gameId: 'game-123' });
    }

    await waitFor(() => {
      expect(screen.getByText(/match found/i)).toBeInTheDocument();
    });
  });

  it('should display error message on matchmaking error', async () => {
    render(
      <TestWrapper>
        <MatchmakingUI />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    // Simulate matchmakingError event
    const errorCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'matchmakingError'
    );
    if (errorCall) {
      errorCall[1]({ error: 'Failed to join queue' });
    }

    await waitFor(() => {
      expect(screen.getByText(/failed to join queue/i)).toBeInTheDocument();
    });
  });
});

