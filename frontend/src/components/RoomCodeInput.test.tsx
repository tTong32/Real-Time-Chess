import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { RoomCodeInput } from './RoomCodeInput';
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

describe('RoomCodeInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.on.mockClear();
  });

  it('should render room code input field', () => {
    render(
      <TestWrapper>
        <RoomCodeInput />
      </TestWrapper>
    );

    expect(screen.getByPlaceholderText(/room code/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
  });

  it('should allow entering room code', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <RoomCodeInput />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText(/room code/i);
    await user.type(input, 'ABC123');

    expect(input).toHaveValue('ABC123');
  });

  it('should join room when join button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <RoomCodeInput />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText(/room code/i);
    await user.type(input, 'ABC123');

    const joinButton = screen.getByRole('button', { name: /join/i });
    await user.click(joinButton);

    expect(mockSocket.joinRoom).toHaveBeenCalledWith('ABC123');
  });

  it('should show error on invalid room code', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <RoomCodeInput />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText(/room code/i);
    await user.type(input, 'AB'); // Too short

    const joinButton = screen.getByRole('button', { name: /join/i });
    await user.click(joinButton);

    expect(screen.getByText(/invalid room code/i)).toBeInTheDocument();
  });

  it('should handle roomJoined event', async () => {
    render(
      <TestWrapper>
        <RoomCodeInput />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    // Simulate roomJoined event
    const roomJoinedCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'roomJoined'
    );
    if (roomJoinedCall) {
      roomJoinedCall[1]({ gameId: 'game-123', roomCode: 'ABC123' });
    }

    await waitFor(() => {
      expect(screen.getByText(/joined room/i)).toBeInTheDocument();
    });
  });

  it('should handle roomError event', async () => {
    render(
      <TestWrapper>
        <RoomCodeInput />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(mockSocket.on).toHaveBeenCalled();
    });

    // Simulate roomError event
    const roomErrorCall = mockSocket.on.mock.calls.find(
      (call) => call[0] === 'roomError'
    );
    if (roomErrorCall) {
      roomErrorCall[1]({ error: 'Room not found' });
    }

    await waitFor(() => {
      expect(screen.getByText(/room not found/i)).toBeInTheDocument();
    });
  });

  it('should convert room code to uppercase', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <RoomCodeInput />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText(/room code/i);
    await user.type(input, 'abc123');

    // Should be converted to uppercase
    expect(input).toHaveValue('ABC123');
  });
});

