import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { SpectateGameList } from './SpectateGameList';
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

// Mock fetch for getting active games
global.fetch = vi.fn();

describe('SpectateGameList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  it('should render spectate game list', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ games: [] }),
    });

    render(
      <TestWrapper>
        <SpectateGameList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/spectate games/i)).toBeInTheDocument();
    });
  });

  it('should display list of active games', async () => {
    const mockGames = [
      {
        id: 'game-1',
        whiteId: 'user-1',
        blackId: 'user-2',
        status: 'ACTIVE',
        startedAt: new Date().toISOString(),
        white: { elo: 1200 },
        black: { elo: 1100 },
      },
      {
        id: 'game-2',
        whiteId: 'user-3',
        blackId: 'user-4',
        status: 'ACTIVE',
        startedAt: new Date().toISOString(),
        white: { elo: 1300 },
        black: { elo: 1250 },
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ games: mockGames }),
    });

    render(
      <TestWrapper>
        <SpectateGameList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/game-1/i)).toBeInTheDocument();
      expect(screen.getByText(/game-2/i)).toBeInTheDocument();
    });
  });

  it('should show loading state while fetching games', () => {
    (global.fetch as any).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <TestWrapper>
        <SpectateGameList />
      </TestWrapper>
    );

    expect(screen.getByText(/loading games/i)).toBeInTheDocument();
  });

  it('should display error message on fetch failure', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(
      <TestWrapper>
        <SpectateGameList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should allow clicking on a game to spectate', async () => {
    const user = userEvent.setup();
    const mockGames = [
      {
        id: 'game-1',
        whiteId: 'user-1',
        blackId: 'user-2',
        status: 'ACTIVE',
        startedAt: new Date().toISOString(),
        white: { elo: 1200 },
        black: { elo: 1100 },
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ games: mockGames }),
    });

    render(
      <TestWrapper>
        <SpectateGameList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/game-1/i)).toBeInTheDocument();
    });

    const spectateButton = screen.getByRole('button', { name: /spectate/i });
    expect(spectateButton).toBeInTheDocument();

    await user.click(spectateButton);
    expect(mockSocket.spectateGame).toHaveBeenCalledWith('game-1');
  });

  it('should refresh game list', async () => {
    const user = userEvent.setup();
    const mockGames = [
      {
        id: 'game-1',
        whiteId: 'user-1',
        blackId: 'user-2',
        status: 'ACTIVE',
        startedAt: new Date().toISOString(),
        white: { elo: 1200 },
        black: { elo: 1100 },
      },
    ];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ games: mockGames }),
    });

    render(
      <TestWrapper>
        <SpectateGameList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/game-1/i)).toBeInTheDocument();
    });

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);

    // Should fetch again
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('should display empty state when no games available', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ games: [] }),
    });

    render(
      <TestWrapper>
        <SpectateGameList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/no active games/i)).toBeInTheDocument();
    });
  });
});

