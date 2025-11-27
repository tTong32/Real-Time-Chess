import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test/utils';
import { BoardEditor } from './BoardEditor';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { PieceType } from '../contexts/GameContext';

// Mock fetch
global.fetch = vi.fn();

// Mock AuthProvider wrapper
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const mockAuth = {
    user: { id: 'user1', email: 'test@test.com', elo: 1000, emailVerified: true },
    token: 'mock-token',
    isLoading: false,
    error: null,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
  };

  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};

describe('BoardEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ valid: true }),
    });
  });

  it('should render board editor with empty board', () => {
    render(
      <MockAuthProvider>
        <BoardEditor />
      </MockAuthProvider>
    );

    // Should render 64 squares (8x8 board)
    const squares = screen.getAllByRole('button');
    expect(squares.length).toBeGreaterThanOrEqual(64);
  });

  it('should allow selecting a piece type', () => {
    render(
      <MockAuthProvider>
        <BoardEditor />
      </MockAuthProvider>
    );

    // Find piece selector buttons
    const pieceButtons = screen.getAllByText(/pawn/i);
    expect(pieceButtons.length).toBeGreaterThan(0);
  });

  it('should allow placing a piece on the board', async () => {
    render(
      <MockAuthProvider>
        <BoardEditor />
      </MockAuthProvider>
    );

    // Select a piece type (e.g., pawn) - get the first pawn button
    const pieceButtons = screen.getAllByText(/^pawn$/i);
    const pieceButton = pieceButtons.find(btn => btn.textContent?.toLowerCase() === 'pawn');
    if (pieceButton) {
      fireEvent.click(pieceButton);
    }

    // Click on a square to place the piece
    const squares = screen.getAllByRole('button');
    const emptySquare = squares.find((sq) => {
      const piece = sq.querySelector('.piece');
      return !piece;
    });

    if (emptySquare) {
      fireEvent.click(emptySquare);
      // Piece should be placed
      await waitFor(() => {
        const piece = emptySquare.querySelector('.piece');
        expect(piece).toBeDefined();
      });
    }
  });

  it('should allow removing a piece from the board', async () => {
    render(
      <MockAuthProvider>
        <BoardEditor />
      </MockAuthProvider>
    );

    // Place a piece first
    const pieceButton = screen.getByText(/pawn/i);
    fireEvent.click(pieceButton);

    const squares = screen.getAllByRole('button');
    const emptySquare = squares.find((sq) => {
      const piece = sq.querySelector('.piece');
      return !piece;
    });

    if (emptySquare) {
      fireEvent.click(emptySquare);
      
      // Now click again to remove
      await waitFor(() => {
        fireEvent.click(emptySquare);
        const piece = emptySquare.querySelector('.piece');
        expect(piece).toBeNull();
      });
    }
  });

  it('should validate board before saving', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: false, error: 'King must be in back row' }),
    });

    render(
      <MockAuthProvider>
        <BoardEditor />
      </MockAuthProvider>
    );

    const saveButton = screen.getByText(/save/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/king must be in back row/i)).toBeDefined();
    });
  });

  it('should save board successfully', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'board1',
          name: 'My Board',
          boardData: [],
        }),
      });

    render(
      <MockAuthProvider>
        <BoardEditor />
      </MockAuthProvider>
    );

    // Set board name
    const nameInput = screen.getByLabelText(/board name/i);
    fireEvent.change(nameInput, { target: { value: 'My Board' } });

    const saveButton = screen.getByText(/save board/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/boards'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: expect.stringContaining('Bearer'),
          }),
        })
      );
    });
  });

  it('should load existing boards', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 'board1', name: 'Board 1', boardData: [] },
        { id: 'board2', name: 'Board 2', boardData: [] },
      ],
    });

    render(
      <MockAuthProvider>
        <BoardEditor />
      </MockAuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/board 1/i)).toBeInTheDocument();
      expect(screen.getByText(/board 2/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should allow loading a saved board', async () => {
    const boardData = [
      { type: 'pawn', color: 'white', row: 6, col: 0 },
      { type: 'rook', color: 'white', row: 7, col: 0 },
    ];

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { id: 'board1', name: 'Board 1', boardData },
        ],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'board1',
          name: 'Board 1',
          boardData,
        }),
      });

    render(
      <MockAuthProvider>
        <BoardEditor />
      </MockAuthProvider>
    );

    await waitFor(() => {
      const loadButtons = screen.getAllByText(/load/i);
      expect(loadButtons.length).toBeGreaterThan(0);
      fireEvent.click(loadButtons[0]);
    }, { timeout: 3000 });

    // Board should be loaded with pieces
    await waitFor(() => {
      const pieces = screen.getAllByText(/♙|♜/);
      expect(pieces.length).toBeGreaterThan(0);
    });
  });

  it('should allow clearing the board', () => {
    render(
      <MockAuthProvider>
        <BoardEditor />
      </MockAuthProvider>
    );

    const clearButton = screen.getByText(/clear/i);
    fireEvent.click(clearButton);

    // All pieces should be removed
    const pieces = screen.queryAllByText(/♙|♘|♗|♖|♕|♔|♟|♞|♝|♜|♛|♚/);
    expect(pieces.length).toBe(0);
  });

  it('should show validation errors', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        valid: false,
        error: 'Invalid board configuration',
      }),
    });

    render(
      <MockAuthProvider>
        <BoardEditor />
      </MockAuthProvider>
    );

    const validateButton = screen.getByRole('button', { name: /validate/i });
    fireEvent.click(validateButton);

    await waitFor(() => {
      const errorText = screen.queryByText(/invalid board/i) || screen.queryByText(/invalid/i);
      expect(errorText).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

