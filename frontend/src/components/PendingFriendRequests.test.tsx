import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { PendingFriendRequests } from './PendingFriendRequests';
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

describe('PendingFriendRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render pending friend requests', async () => {
    const mockRequests = [
      {
        id: 'request-1',
        sender: { id: 'sender-1', elo: 1200, createdAt: '2024-01-01T00:00:00Z' },
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ pendingRequests: mockRequests }),
    });

    render(
      <TestWrapper>
        <PendingFriendRequests />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/pending friend requests/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/sender-1/i)).toBeInTheDocument();
  });

  it('should handle accept request', async () => {
    const mockRequests = [
      {
        id: 'request-1',
        sender: { id: 'sender-1', elo: 1200, createdAt: '2024-01-01T00:00:00Z' },
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pendingRequests: mockRequests }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ACCEPTED' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pendingRequests: [] }),
      });

    render(
      <TestWrapper>
        <PendingFriendRequests />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/sender-1/i)).toBeInTheDocument();
    });

    const acceptButton = screen.getByRole('button', { name: /accept/i });
    await userEvent.click(acceptButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/friends/accept'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('should handle reject request', async () => {
    const mockRequests = [
      {
        id: 'request-1',
        sender: { id: 'sender-1', elo: 1200, createdAt: '2024-01-01T00:00:00Z' },
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pendingRequests: mockRequests }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Friend request rejected' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pendingRequests: [] }),
      });

    render(
      <TestWrapper>
        <PendingFriendRequests />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/sender-1/i)).toBeInTheDocument();
    });

    const rejectButton = screen.getByRole('button', { name: /reject/i });
    await userEvent.click(rejectButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/friends/reject'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });
});

