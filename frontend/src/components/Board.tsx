import React from 'react';
import { useGame } from '../contexts/GameContext';
import { Piece } from '../contexts/GameContext';

interface BoardProps {
  className?: string;
}

export const Board: React.FC<BoardProps> = ({ className = '' }) => {
  const { gameState, selectedSquare, handleSquareClick, isWhitePlayer } = useGame();

  // Get piece at a specific square
  const getPiece = (row: number, col: number): Piece | null => {
    if (!gameState || !gameState.board) return null;
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    return gameState.board[row]?.[col] || null;
  };

  // Check if a square is selected
  const isSelected = (row: number, col: number): boolean => {
    return (
      selectedSquare !== null &&
      selectedSquare.row === row &&
      selectedSquare.col === col
    );
  };

  // Determine if square is light or dark
  const isLightSquare = (row: number, col: number): boolean => {
    return (row + col) % 2 === 0;
  };

  // Get piece display character/icon
  const getPieceDisplay = (piece: Piece | null): string => {
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

  // Get square label for accessibility
  const getSquareLabel = (row: number, col: number): string => {
    const file = String.fromCharCode(97 + col); // a-h
    const rank = 8 - row; // 1-8
    const piece = getPiece(row, col);
    
    if (piece) {
      return `${piece.color} ${piece.type} on ${file}${rank}`;
    }
    return `${file}${rank}`;
  };

  // Render a single square
  const renderSquare = (row: number, col: number) => {
    const piece = getPiece(row, col);
    const selected = isSelected(row, col);
    const light = isLightSquare(row, col);
    const pieceDisplay = getPieceDisplay(piece);

    const squareClasses = [
      'square',
      light ? 'square-light' : 'square-dark',
      selected ? 'square-selected' : '',
      piece ? `piece-${piece.color}` : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        key={`${row}-${col}`}
        className={squareClasses}
        onClick={() => handleSquareClick(row, col)}
        data-row={row}
        data-col={col}
        data-selected={selected}
        aria-label={getSquareLabel(row, col)}
        type="button"
      >
        {pieceDisplay && (
          <span className="piece" data-piece-type={piece?.type} data-piece-color={piece?.color}>
            {pieceDisplay}
          </span>
        )}
      </button>
    );
  };

  // Determine board orientation
  // If user is black, flip the board
  const shouldFlipBoard = isWhitePlayer === false;

  return (
    <div className={`board ${className}`} data-flipped={shouldFlipBoard}>
      <div className="board-grid">
        {Array.from({ length: 8 }, (_, row) =>
          Array.from({ length: 8 }, (_, col) => {
            const displayRow = shouldFlipBoard ? 7 - row : row;
            const displayCol = shouldFlipBoard ? 7 - col : col;
            return renderSquare(displayRow, displayCol);
          })
        )}
      </div>
    </div>
  );
};

