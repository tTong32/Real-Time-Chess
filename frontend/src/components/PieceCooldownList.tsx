import React, { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { Piece } from '../contexts/GameContext';

interface CooldownPiece {
  piece: Piece;
  remainingSeconds: number;
}

export const PieceCooldownList: React.FC = () => {
  const { gameState, isWhitePlayer } = useGame();
  const [cooldownPieces, setCooldownPieces] = useState<CooldownPiece[]>([]);

  useEffect(() => {
    if (!gameState) {
      setCooldownPieces([]);
      return;
    }

    const updateCooldowns = () => {
      const playerState =
        isWhitePlayer === true
          ? gameState.whiteState
          : isWhitePlayer === false
          ? gameState.blackState
          : null;

      if (!playerState) {
        setCooldownPieces([]);
        return;
      }

      const pieces: CooldownPiece[] = [];

      // Find all pieces on the board for this player
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const piece = gameState.board[row]?.[col];
          if (
            piece &&
            piece.color === (isWhitePlayer ? 'white' : 'black') &&
            playerState.pieceCooldowns[piece.id]
          ) {
            const cooldownEnd = playerState.pieceCooldowns[piece.id];
            const now = Date.now();
            const remaining = cooldownEnd - now;

            if (remaining > 0) {
              pieces.push({
                piece,
                remainingSeconds: Math.ceil(remaining / 1000),
              });
            }
          }
        }
      }

      // Sort by remaining time
      pieces.sort((a, b) => a.remainingSeconds - b.remainingSeconds);
      setCooldownPieces(pieces);
    };

    updateCooldowns();

    // Update every second
    const interval = setInterval(updateCooldowns, 1000);

    return () => clearInterval(interval);
  }, [gameState, isWhitePlayer]);

  if (cooldownPieces.length === 0) {
    return (
      <div className="cooldown-list" data-testid="cooldown-list">
        <div className="cooldown-list-header">Piece Cooldowns</div>
        <div className="cooldown-list-empty">No pieces on cooldown</div>
      </div>
    );
  }

  const getPieceName = (piece: Piece): string => {
    const typeNames: Record<string, string> = {
      pawn: 'Pawn',
      knight: 'Knight',
      bishop: 'Bishop',
      rook: 'Rook',
      queen: 'Queen',
      king: 'King',
      twistedPawn: 'Twisted Pawn',
      pawnGeneral: 'Pawn General',
      flyingCastle: 'Flying Castle',
      prince: 'Prince',
      iceBishop: 'Ice Bishop',
    };
    return typeNames[piece.type] || piece.type;
  };

  const getSquareNotation = (row: number, col: number): string => {
    const file = String.fromCharCode(97 + col);
    const rank = 8 - row;
    return `${file}${rank}`;
  };

  return (
    <div className="cooldown-list" data-testid="cooldown-list">
      <div className="cooldown-list-header">Pieces on Cooldown</div>
      <div className="cooldown-list-items">
        {cooldownPieces.map(({ piece, remainingSeconds }) => (
          <div key={piece.id} className="cooldown-list-item">
            <span className="cooldown-piece-name">
              {getPieceName(piece)} ({getSquareNotation(piece.row, piece.col)})
            </span>
            <span className="cooldown-time">{remainingSeconds}s</span>
          </div>
        ))}
      </div>
    </div>
  );
};

