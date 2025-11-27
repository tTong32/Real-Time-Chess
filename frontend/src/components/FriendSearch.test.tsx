import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { FriendSearch } from './FriendSearch';
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

describe('FriendSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render search input', () => {
    render(
      <TestWrapper>
        <FriendSearch />
      </TestWrapper>
    );

    expect(screen.getByPlaceholderText(/search by email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('should search for users by email', async () => {
    const mockUsers = [
      { id: 'user-2', elo: 1100, createdAt: '2024-01-01T00:00:00Z' },
      { id: 'user-3', elo: 1200, createdAt: '2024-01-02T00:00:00Z' },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ users: mockUsers }),
    });

    render(
      <TestWrapper>
        <FriendSearch />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText(/search by email/i);
    const searchButton = screen.getByRole('button', { name: /search/i });

    await userEvent.type(searchInput, 'test@example.com');
    await userEvent.click(searchButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/friends/search?email=test%40example.com'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('test-token'),
          }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/user-2/i)).toBeInTheDocument();
      expect(screen.getByText(/user-3/i)).toBeInTheDocument();
    });
  });

  it('should display "no users found" when search returns empty', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ users: [] }),
    });

    render(
      <TestWrapper>
        <FriendSearch />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText(/search by email/i);
    const searchButton = screen.getByRole('button', { name: /search/i });

    await userEvent.type(searchInput, 'nonexistent@example.com');
    await userEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/no users found/i)).toBeInTheDocument();
    });
  });

  it('should send friend request when add button is clicked', async () => {
    const mockUsers = [
      { id: 'user-2', elo: 1100, createdAt: '2024-01-01T00:00:00Z' },
    ];

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: mockUsers }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'friendship-1',
          senderId: 'user-1',
          receiverId: 'user-2',
          status: 'PENDING',
        }),
      });

    render(
      <TestWrapper>
        <FriendSearch />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText(/search by email/i);
    const searchButton = screen.getByRole('button', { name: /search/i });

    await userEvent.type(searchInput, 'test@example.com');
    await userEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/user-2/i)).toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /add friend/i });
    await userEvent.click(addButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/friends/send'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('test-token'),
          }),
        })
      );
    });
  });

  it('should not allow searching with empty input', async () => {
    render(
      <TestWrapper>
        <FriendSearch />
      </TestWrapper>
    );

    const searchButton = screen.getByRole('button', { name: /search/i });
    await userEvent.click(searchButton);

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(
      <TestWrapper>
        <FriendSearch />
      </TestWrapper>
    );

    const searchInput = screen.getByPlaceholderText(/search by email/i);
    const searchButton = screen.getByRole('button', { name: /search/i });

    await userEvent.type(searchInput, 'test@example.com');
    await userEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});

