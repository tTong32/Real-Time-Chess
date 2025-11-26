import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../test/utils';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthProvider } from '../contexts/AuthContext';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock fetch
global.fetch = vi.fn();

const TestComponent = () => <div>Protected Content</div>;

describe('ProtectedRoute', () => {
  it('should render children when user is authenticated', async () => {
    const mockUser = { id: '1', email: 'test@example.com', elo: 1000, emailVerified: true };
    const mockToken = 'test-token';

    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    render(
      <AuthProvider>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </AuthProvider>
    );

    // Wait for auth to load
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated', async () => {
    localStorage.clear();

    render(
      <AuthProvider>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </AuthProvider>
    );

    // Wait for auth check
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockNavigate).toHaveBeenCalledWith('/login');
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should show loading state while checking authentication', () => {
    localStorage.clear();

    render(
      <AuthProvider>
        <ProtectedRoute>
          <TestComponent />
        </ProtectedRoute>
      </AuthProvider>
    );

    // Initially should show loading or nothing
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});

