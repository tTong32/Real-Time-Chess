import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

// Game state types (matching backend types)
export type PieceType =
  | 'pawn'
  | 'knight'
  | 'bishop'
  | 'rook'
  | 'queen'
  | 'king'
  | 'twistedPawn'
  | 'pawnGeneral'
  | 'flyingCastle'
  | 'prince'
  | 'iceBishop';

export type PieceColor = 'white' | 'black';

export interface Piece {
  id: string;
  type: PieceType;
  color: PieceColor;
  row: number;
  col: number;
  hasMoved: boolean;
  canPreventCapture?: boolean;
}

export interface PlayerState {
  energy: number;
  energyRegenRate: number;
  lastEnergyUpdate: number;
  pieceCooldowns: Record<string, number>; // pieceId -> cooldownEndTimestamp
}

export interface GameState {
  id: string;
  board: (Piece | null)[][];
  whiteState: PlayerState;
  blackState: PlayerState;
  whitePlayerId?: string;
  blackPlayerId?: string;
  currentTurn: PieceColor | null;
  status: 'waiting' | 'active' | 'paused' | 'finished';
  winner: PieceColor | null;
  startedAt: number | null;
  lastMoveAt: number | null;
}

export interface SelectedSquare {
  row: number;
  col: number;
}

interface GameContextType {
  gameId: string | null;
  gameState: GameState | null;
  isWhitePlayer: boolean | null; // null if not in game or unknown
  selectedSquare: SelectedSquare | null;
  error: string | null;
  // Actions
  selectSquare: (row: number, col: number) => void;
  clearSelection: () => void;
  makeMove: (fromRow: number, fromCol: number, toRow: number, toCol: number) => void;
  handleSquareClick: (row: number, col: number) => void;
  clearError: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

interface GameProviderProps {
  children: ReactNode;
}

export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<SelectedSquare | null>(null);
  const [error, setError] = useState<string | null>(null);
  const handlersRef = useRef<Map<string, (...args: any[]) => void>>(new Map());

  // Determine if current user is white player
  const isWhitePlayer: boolean | null = React.useMemo(() => {
    if (!gameState || !user) return null;
    if (gameState.whitePlayerId === user.id) return true;
    if (gameState.blackPlayerId === user.id) return false;
    return null;
  }, [gameState, user]);

  // Register socket event handlers
  useEffect(() => {
    if (!socket) return;

    // Game started handler
    const handleGameStarted = (data: { gameId: string; state: GameState }) => {
      setGameId(data.gameId);
      setGameState(data.state);
      setSelectedSquare(null);
      setError(null);
    };

    // Game state update handler
    const handleGameStateUpdate = (state: GameState) => {
      setGameState(state);
    };

    // Move accepted handler
    const handleMoveAccepted = () => {
      setSelectedSquare(null);
      setError(null);
    };

    // Move rejected handler
    const handleMoveRejected = (data: { reason: string }) => {
      setError(data.reason);
      // Don't clear selection on rejection - user might want to try another square
    };

    // Game ended handler
    const handleGameEnded = (data: { gameId: string; winner: PieceColor; state: GameState }) => {
      setGameState(data.state);
      setSelectedSquare(null);
    };

    // Register handlers
    socket.on('gameStarted', handleGameStarted);
    socket.on('gameStateUpdate', handleGameStateUpdate);
    socket.on('moveAccepted', handleMoveAccepted);
    socket.on('moveRejected', handleMoveRejected);
    socket.on('gameEnded', handleGameEnded);

    // Store handlers for cleanup
    handlersRef.current.set('gameStarted', handleGameStarted);
    handlersRef.current.set('gameStateUpdate', handleGameStateUpdate);
    handlersRef.current.set('moveAccepted', handleMoveAccepted);
    handlersRef.current.set('moveRejected', handleMoveRejected);
    handlersRef.current.set('gameEnded', handleGameEnded);

    // Cleanup
    return () => {
      socket.off('gameStarted', handleGameStarted);
      socket.off('gameStateUpdate', handleGameStateUpdate);
      socket.off('moveAccepted', handleMoveAccepted);
      socket.off('moveRejected', handleMoveRejected);
      socket.off('gameEnded', handleGameEnded);
      handlersRef.current.clear();
    };
  }, [socket]);

  // Actions
  const selectSquare = (row: number, col: number) => {
    if (row < 0 || row > 7 || col < 0 || col > 7) {
      setError('Invalid square coordinates');
      return;
    }
    setSelectedSquare({ row, col });
    setError(null);
  };

  const clearSelection = () => {
    setSelectedSquare(null);
  };

  const makeMove = (
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ) => {
    if (!gameId) {
      setError('No active game');
      return;
    }

    if (!socket.connected) {
      setError('Not connected to server');
      return;
    }

    // Validate coordinates
    if (
      fromRow < 0 ||
      fromRow > 7 ||
      fromCol < 0 ||
      fromCol > 7 ||
      toRow < 0 ||
      toRow > 7 ||
      toCol < 0 ||
      toCol > 7
    ) {
      setError('Invalid move coordinates');
      return;
    }

    socket.makeMove(gameId, fromRow, fromCol, toRow, toCol);
  };

  const handleSquareClick = (row: number, col: number) => {
    if (!selectedSquare) {
      // No square selected, select this one
      selectSquare(row, col);
    } else {
      // Square already selected
      if (selectedSquare.row === row && selectedSquare.col === col) {
        // Clicked the same square, deselect
        clearSelection();
      } else {
        // Clicked a different square, make a move
        makeMove(selectedSquare.row, selectedSquare.col, row, col);
      }
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: GameContextType = {
    gameId,
    gameState,
    isWhitePlayer,
    selectedSquare,
    error,
    selectSquare,
    clearSelection,
    makeMove,
    handleSquareClick,
    clearError,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

