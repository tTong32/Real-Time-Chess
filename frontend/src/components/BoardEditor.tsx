import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PieceType, PieceColor } from '../contexts/GameContext';

interface BoardPiece {
  type: PieceType;
  color: PieceColor;
  row: number;
  col: number;
}

interface CustomBoard {
  id: string;
  name: string;
  boardData: BoardPiece[];
  createdAt: string;
  updatedAt: string;
}

export const BoardEditor: React.FC = () => {
  const { token } = useAuth();
  const [board, setBoard] = useState<(BoardPiece | null)[][]>(
    Array(8)
      .fill(null)
      .map(() => Array(8).fill(null))
  );
  const [selectedPieceType, setSelectedPieceType] = useState<PieceType | null>(null);
  const [selectedColor, setSelectedColor] = useState<PieceColor>('white');
  const [boardName, setBoardName] = useState('');
  const [savedBoards, setSavedBoards] = useState<CustomBoard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null);

  // Load saved boards on mount
  useEffect(() => {
    loadSavedBoards();
  }, []);

  const loadSavedBoards = async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/boards', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const boards = await response.json();
        setSavedBoards(boards);
      }
    } catch (err) {
      console.error('Failed to load boards:', err);
    }
  };

  const getPieceDisplay = (piece: BoardPiece | null): string => {
    if (!piece) return '';

    const pieceSymbols: Record<string, { white: string; black: string }> = {
      pawn: { white: '♙', black: '♟' },
      knight: { white: '♘', black: '♞' },
      bishop: { white: '♗', black: '♝' },
      rook: { white: '♖', black: '♜' },
      queen: { white: '♕', black: '♛' },
      king: { white: '♔', black: '♚' },
      twistedPawn: { white: '♙', black: '♟' },
      pawnGeneral: { white: '♙', black: '♟' },
      flyingCastle: { white: '♖', black: '♜' },
      prince: { white: '♔', black: '♚' },
      iceBishop: { white: '♗', black: '♝' },
    };

    const symbols = pieceSymbols[piece.type] || { white: '?', black: '?' };
    return piece.color === 'white' ? symbols.white : symbols.black;
  };

  const handleSquareClick = (row: number, col: number) => {
    const newBoard = board.map((r) => r.map((p) => (p ? { ...p } : null)));

    if (selectedPieceType) {
      // Place or replace piece
      const existingPiece = newBoard[row][col];
      
      if (existingPiece && existingPiece.type === selectedPieceType && existingPiece.color === selectedColor) {
        // Remove piece if clicking same type and color
        newBoard[row][col] = null;
      } else {
        // Place new piece
        newBoard[row][col] = {
          type: selectedPieceType,
          color: selectedColor,
          row,
          col,
        };
      }
    } else {
      // Remove piece if no selection
      newBoard[row][col] = null;
    }

    setBoard(newBoard);
    setValidationResult(null);
  };

  const clearBoard = () => {
    setBoard(Array(8).fill(null).map(() => Array(8).fill(null)));
    setValidationResult(null);
  };

  const validateBoard = async () => {
    if (!token) {
      setError('You must be logged in to validate boards');
      return;
    }

    setLoading(true);
    setError(null);
    setValidationResult(null);

    try {
      // Convert board to array format for API
      const boardData: BoardPiece[] = [];
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = board[row][col];
          if (piece) {
            boardData.push(piece);
          }
        }
      }

      const response = await fetch('/api/boards/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ boardData }),
      });

      const result = await response.json();
      setValidationResult(result);

      if (!result.valid) {
        setError(result.error || 'Invalid board configuration');
      } else {
        setSuccess('Board is valid!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to validate board');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveBoard = async () => {
    if (!token) {
      setError('You must be logged in to save boards');
      return;
    }

    if (!boardName.trim()) {
      setError('Please enter a board name');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Convert board to array format for API
      const boardData: BoardPiece[] = [];
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = board[row][col];
          if (piece) {
            boardData.push(piece);
          }
        }
      }

      // Validate first
      const validateResponse = await fetch('/api/boards/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ boardData }),
      });

      const validateResult = await validateResponse.json();
      if (!validateResult.valid) {
        setError(validateResult.error || 'Invalid board configuration');
        setLoading(false);
        return;
      }

      // Save board
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: boardName.trim(),
          boardData,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save board');
      }

      setSuccess('Board saved successfully!');
      setBoardName('');
      await loadSavedBoards();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save board');
    } finally {
      setLoading(false);
    }
  };

  const loadBoard = async (boardId: string) => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load board');
      }

      const boardData: CustomBoard = await response.json();
      
      // Convert board data to grid format
      const newBoard: (BoardPiece | null)[][] = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));

      for (const piece of boardData.boardData) {
        if (piece.row >= 0 && piece.row < 8 && piece.col >= 0 && piece.col < 8) {
          newBoard[piece.row][piece.col] = piece;
        }
      }

      setBoard(newBoard);
      setBoardName(boardData.name);
      setValidationResult(null);
      setSuccess('Board loaded successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to load board');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteBoard = async (boardId: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete this board?')) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete board');
      }

      await loadSavedBoards();
      setSuccess('Board deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to delete board');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const pieceTypes: PieceType[] = [
    'pawn',
    'knight',
    'bishop',
    'rook',
    'queen',
    'king',
    'twistedPawn',
    'pawnGeneral',
    'flyingCastle',
    'prince',
    'iceBishop',
  ];

  const isLightSquare = (row: number, col: number): boolean => {
    return (row + col) % 2 === 0;
  };

  return (
    <div className="board-editor" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 600 }}>
        Custom Board Editor
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Left Panel: Controls */}
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 600 }}>
              Piece Selection
            </h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Color:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setSelectedColor('white')}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: selectedColor === 'white' ? '#3b82f6' : '#e5e7eb',
                    color: selectedColor === 'white' ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  White
                </button>
                <button
                  onClick={() => setSelectedColor('black')}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: selectedColor === 'black' ? '#3b82f6' : '#e5e7eb',
                    color: selectedColor === 'black' ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Black
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Piece Type:
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                }}
              >
                {pieceTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() =>
                      setSelectedPieceType(selectedPieceType === type ? null : type)
                    }
                    style={{
                      padding: '0.5rem',
                      backgroundColor:
                        selectedPieceType === type ? '#3b82f6' : '#f3f4f6',
                      color: selectedPieceType === type ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      textTransform: 'capitalize',
                    }}
                  >
                    {type.replace(/([A-Z])/g, ' $1').trim()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>
              {selectedPieceType ? (
                <p>
                  Selected: <strong>{selectedPieceType}</strong> ({selectedColor})
                </p>
              ) : (
                <p>Click a piece type to select it, then click on the board to place it.</p>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 600 }}>
              Board Actions
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={clearBoard}
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Clear Board
              </button>
              
              <button
                onClick={validateBoard}
                disabled={loading}
                style={{
                  padding: '0.75rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  opacity: loading ? 0.5 : 1,
                }}
              >
                Validate
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 600 }}>
              Save Board
            </h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="board-name"
                style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}
              >
                Board Name:
              </label>
              <input
                id="board-name"
                type="text"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                placeholder="Enter board name"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.25rem',
                  fontSize: '1rem',
                }}
              />
            </div>
            
            <button
              onClick={saveBoard}
              disabled={loading || !boardName.trim()}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: loading || !boardName.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                opacity: loading || !boardName.trim() ? 0.5 : 1,
              }}
            >
              Save Board
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                borderRadius: '0.25rem',
                marginBottom: '1rem',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#d1fae5',
                color: '#065f46',
                borderRadius: '0.25rem',
                marginBottom: '1rem',
                fontSize: '0.875rem',
              }}
            >
              {success}
            </div>
          )}

          {validationResult && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: validationResult.valid ? '#d1fae5' : '#fee2e2',
                color: validationResult.valid ? '#065f46' : '#991b1b',
                borderRadius: '0.25rem',
                marginBottom: '1rem',
                fontSize: '0.875rem',
              }}
            >
              {validationResult.valid
                ? '✓ Board is valid!'
                : `✗ ${validationResult.error || 'Invalid board'}`}
            </div>
          )}
        </div>

        {/* Right Panel: Board and Saved Boards */}
        <div>
          {/* Board */}
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 600 }}>
              Board
            </h2>
            <div className="board">
              <div className="board-grid">
                {Array.from({ length: 8 }, (_, row) =>
                  Array.from({ length: 8 }, (_, col) => {
                    const piece = board[row][col];
                    const light = isLightSquare(row, col);
                    const pieceDisplay = getPieceDisplay(piece);

                    return (
                      <div key={`${row}-${col}`} className="square-container">
                        <button
                          className={`square ${light ? 'square-light' : 'square-dark'}`}
                          onClick={() => handleSquareClick(row, col)}
                          style={{
                            position: 'relative',
                          }}
                        >
                          {pieceDisplay && (
                            <span
                              className={`piece piece-${piece?.color}`}
                              style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)' }}
                            >
                              {pieceDisplay}
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Saved Boards */}
          <div>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 600 }}>
              Saved Boards
            </h2>
            {savedBoards.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No saved boards yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {savedBoards.map((board) => (
                  <div
                    key={board.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      backgroundColor: '#f9fafb',
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                        {board.name}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {new Date(board.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => loadBoard(board.id)}
                        disabled={loading}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          opacity: loading ? 0.5 : 1,
                        }}
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteBoard(board.id)}
                        disabled={loading}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.25rem',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          fontSize: '0.875rem',
                          opacity: loading ? 0.5 : 1,
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

