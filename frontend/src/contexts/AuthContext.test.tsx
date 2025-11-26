import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';
import { ReactNode } from 'react';

// Mock fetch globally
global.fetch = vi.fn();

// Test component that uses the auth context
const TestComponent = () => {
  const { user, token, login, logout, signup, isLoading, error } = useAuth();
  
  const handleLogin = async () => {
    try {
      await login('test@example.com', 'password123');
    } catch (err) {
      // Error is handled by context
    }
  };

  const handleSignup = async () => {
    try {
      await signup('test@example.com', 'password123');
    } catch (err) {
      // Error is handled by context
    }
  };
  
  return (
    <div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <div data-testid="token">{token || 'null'}</div>
      <div data-testid="loading">{isLoading ? 'true' : 'false'}</div>
      <div data-testid="error">{error || 'null'}</div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleSignup}>Signup</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should provide initial state with no user', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('token')).toHaveTextContent('null');
    expect(screen.getByTestId('error')).toHaveTextContent('null');
  });

  it('should load user from localStorage on mount', async () => {
    const mockUser = { id: '1', email: 'test@example.com', elo: 1000, emailVerified: true };
    const mockToken = 'mock-token';
    
    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
      expect(screen.getByTestId('token')).toHaveTextContent(mockToken);
    });
  });

  it('should handle successful login', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      token: 'test-token',
      user: { id: '1', email: 'test@example.com', elo: 1000, emailVerified: true },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockResponse.user));
      expect(screen.getByTestId('token')).toHaveTextContent('test-token');
    });

    expect(localStorage.getItem('auth_token')).toBe('test-token');
    expect(localStorage.getItem('auth_user')).toBe(JSON.stringify(mockResponse.user));
  });

  it('should handle login error', async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('error')).not.toHaveTextContent('null');
    });
  });

  it('should handle successful signup', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      message: 'User created successfully',
      userId: '1',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const signupButton = screen.getByText('Signup');
    await user.click(signupButton);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('null');
    });
  });

  it('should handle signup error', async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Email already registered' }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const signupButton = screen.getByText('Signup');
    await user.click(signupButton);

    await waitFor(() => {
      expect(screen.getByTestId('error')).not.toHaveTextContent('null');
    });
  });

  it('should handle logout', async () => {
    const user = userEvent.setup();
    const mockUser = { id: '1', email: 'test@example.com', elo: 1000, emailVerified: true };
    const mockToken = 'mock-token';
    
    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('auth_user', JSON.stringify(mockUser));

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('token')).toHaveTextContent(mockToken);
    });

    const logoutButton = screen.getByText('Logout');
    await user.click(logoutButton);

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('token')).toHaveTextContent('null');
    });

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });
});

