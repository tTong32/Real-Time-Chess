import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/utils';
import { VerifyEmail } from './VerifyEmail';
import * as router from 'react-router-dom';

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

describe('VerifyEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(router, 'useParams').mockReturnValue({ token: 'test-verification-token' });
  });

  it('should render verification message when no token provided', () => {
    vi.spyOn(router, 'useParams').mockReturnValue({});

    render(<VerifyEmail />);

    expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    expect(screen.getByText(/click the link/i)).toBeInTheDocument();
  });

  it('should verify email with token from URL', async () => {
    const mockResponse = {
      message: 'Email verified successfully. You can now log in.',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<VerifyEmail />);

    await waitFor(() => {
      expect(screen.getByText(/email verified successfully/i, { selector: 'p' })).toBeInTheDocument();
    });

    // Wait for navigation (happens after 2 seconds)
    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      },
      { timeout: 3000 }
    );
  });

  it('should display error message on verification failure', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid or expired verification token' }),
    });

    render(<VerifyEmail />);

    await waitFor(() => {
      expect(screen.getByText(/invalid or expired verification token/i)).toBeInTheDocument();
    });
  });

  it('should show loading state during verification', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (global.fetch as any).mockReturnValueOnce(promise);

    render(<VerifyEmail />);

    expect(screen.getByText(/verifying email/i)).toBeInTheDocument();

    resolvePromise!({
      ok: true,
      json: async () => ({
        message: 'Email verified successfully',
      }),
    });

    await waitFor(() => {
      expect(screen.queryByText(/verifying email/i)).not.toBeInTheDocument();
    });
  });

  it('should have link to login page', () => {
    vi.spyOn(router, 'useParams').mockReturnValue({});

    render(<VerifyEmail />);

    const loginLink = screen.getByRole('link', { name: /go to login/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });
});

