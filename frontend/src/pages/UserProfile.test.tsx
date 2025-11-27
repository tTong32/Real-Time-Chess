import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '../test/utils';
import { UserProfile } from './UserProfile';
import { AuthProvider } from '../contexts/AuthContext';

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

global.fetch = vi.fn();

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <AuthProvider>{children}</AuthProvider>;
};

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render user profile with user info', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      elo: 1200,
      emailVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const mockStats = {
      elo: 1200,
      totalGames: 10,
      wins: 6,
      losses: 4,
      winRate: 60.0,
      ratedGames: 8,
      ratedWins: 5,
      totalMoves: 150,
      recentGames: [],
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/1200/i)).toBeInTheDocument();
    expect(screen.getByText(/user profile/i)).toBeInTheDocument();
  });

  it('should display game statistics', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      elo: 1200,
      emailVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const mockStats = {
      elo: 1200,
      totalGames: 10,
      wins: 6,
      losses: 4,
      winRate: 60.0,
      ratedGames: 8,
      ratedWins: 5,
      totalMoves: 150,
      recentGames: [],
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/10/i)).toBeInTheDocument(); // totalGames
    });

    expect(screen.getByText(/6/i)).toBeInTheDocument(); // wins
    expect(screen.getByText(/4/i)).toBeInTheDocument(); // losses
    expect(screen.getByText(/60/i)).toBeInTheDocument(); // winRate
  });

  it('should display match history', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      elo: 1200,
      emailVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const mockStats = {
      elo: 1200,
      totalGames: 2,
      wins: 1,
      losses: 1,
      winRate: 50.0,
      ratedGames: 1,
      ratedWins: 1,
      totalMoves: 30,
      recentGames: [
        {
          id: 'game-1',
          status: 'FINISHED',
          winnerId: 'user-1',
          whiteId: 'user-1',
          blackId: 'user-2',
          isRated: true,
          createdAt: '2024-01-01T00:00:00Z',
          endedAt: '2024-01-01T01:00:00Z',
        },
        {
          id: 'game-2',
          status: 'FINISHED',
          winnerId: 'user-2',
          whiteId: 'user-2',
          blackId: 'user-1',
          isRated: false,
          createdAt: '2024-01-02T00:00:00Z',
          endedAt: '2024-01-02T01:00:00Z',
        },
      ],
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/match history/i)).toBeInTheDocument();
    });

    // Should show recent games
    expect(screen.getByText(/game-1/i)).toBeInTheDocument();
    expect(screen.getByText(/game-2/i)).toBeInTheDocument();
  });

  it('should display loading state initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should display account creation date', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      elo: 1200,
      emailVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const mockStats = {
      elo: 1200,
      totalGames: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      ratedGames: 0,
      ratedWins: 0,
      totalMoves: 0,
      recentGames: [],
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/member since/i)).toBeInTheDocument();
    });
  });

  it('should display empty state for no games', async () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      elo: 1000,
      emailVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const mockStats = {
      elo: 1000,
      totalGames: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      ratedGames: 0,
      ratedWins: 0,
      totalMoves: 0,
      recentGames: [],
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockStats,
      });

    render(
      <TestWrapper>
        <UserProfile />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/no games played yet/i)).toBeInTheDocument();
    });
  });
});

