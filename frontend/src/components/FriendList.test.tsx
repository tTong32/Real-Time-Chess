import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { FriendList } from './FriendList';
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

// Mock fetch for API calls
global.fetch = vi.fn();

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return <AuthProvider>{children}</AuthProvider>;
};

describe('FriendList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render friend list', async () => {
    const mockFriends = [
      {
        id: 'friend-1',
        elo: 1200,
        createdAt: '2024-01-01T00:00:00Z',
        friendshipId: 'friendship-1',
        friendshipCreatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'friend-2',
        elo: 1100,
        createdAt: '2024-01-02T00:00:00Z',
        friendshipId: 'friendship-2',
        friendshipCreatedAt: '2024-01-02T00:00:00Z',
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ friends: mockFriends }),
    });

    render(
      <TestWrapper>
        <FriendList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/friends/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/friend-1/i)).toBeInTheDocument();
    expect(screen.getByText(/friend-2/i)).toBeInTheDocument();
  });

  it('should display empty state when no friends', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ friends: [] }),
    });

    render(
      <TestWrapper>
        <FriendList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/no friends yet/i)).toBeInTheDocument();
    });
  });

  it('should handle remove friend action', async () => {
    const mockFriends = [
      {
        id: 'friend-1',
        elo: 1200,
        createdAt: '2024-01-01T00:00:00Z',
        friendshipId: 'friendship-1',
        friendshipCreatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ friends: mockFriends }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Friendship removed' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ friends: [] }),
      });

    render(
      <TestWrapper>
        <FriendList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/friend-1/i)).toBeInTheDocument();
    });

    const removeButton = screen.getByRole('button', { name: /remove/i });
    await userEvent.click(removeButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/friends/remove'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('test-token'),
          }),
        })
      );
    });
  });

  it('should display ELO for each friend', async () => {
    const mockFriends = [
      {
        id: 'friend-1',
        elo: 1200,
        createdAt: '2024-01-01T00:00:00Z',
        friendshipId: 'friendship-1',
        friendshipCreatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ friends: mockFriends }),
    });

    render(
      <TestWrapper>
        <FriendList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/1200/)).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(
      <TestWrapper>
        <FriendList />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});

