import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { Signup } from './Signup';
import { AuthProvider } from '../contexts/AuthContext';

// Mock fetch globally
global.fetch = vi.fn();

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render signup form', () => {
    render(
      <AuthProvider>
        <Signup />
      </AuthProvider>
    );

    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Signup />
      </AuthProvider>
    );

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Signup />
      </AuthProvider>
    );

    const emailInput = screen.getByPlaceholderText('Email address');
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
    });
  });

  it('should show validation error for short password', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Signup />
      </AuthProvider>
    );

    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const submitButton = screen.getByRole('button', { name: /sign up/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, '12345');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
    });
  });

  it('should show validation error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Signup />
      </AuthProvider>
    );

    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /sign up/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password456');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('should handle successful signup', async () => {
    const mockResponse = {
      message: 'User created successfully. Please check your email to verify your account.',
      userId: '1',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Signup />
      </AuthProvider>
    );

    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /sign up/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/verify-email');
    });
  });

  it('should display error message on signup failure', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Email already registered' }),
    });

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Signup />
      </AuthProvider>
    );

    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /sign up/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during signup', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (global.fetch as any).mockReturnValueOnce(promise);

    const user = userEvent.setup();
    render(
      <AuthProvider>
        <Signup />
      </AuthProvider>
    );

    const emailInput = screen.getByPlaceholderText('Email address');
    const passwordInput = screen.getByPlaceholderText('Password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /sign up/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(confirmPasswordInput, 'password123');
    await user.click(submitButton);

    expect(screen.getByText(/creating account/i)).toBeInTheDocument();

    resolvePromise!({
      ok: true,
      json: async () => ({
        message: 'User created successfully',
        userId: '1',
      }),
    });

    await waitFor(() => {
      expect(screen.queryByText(/creating account/i)).not.toBeInTheDocument();
    });
  });

  it('should have link to login page', () => {
    render(
      <AuthProvider>
        <Signup />
      </AuthProvider>
    );

    const loginLink = screen.getByRole('link', { name: /log in/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});

