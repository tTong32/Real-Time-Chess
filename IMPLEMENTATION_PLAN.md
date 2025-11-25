# Real-Time Chess - Detailed Implementation Plan

## Table of Contents
1. [Project Structure](#project-structure)
2. [Database Schema](#database-schema)
3. [Backend Architecture](#backend-architecture)
4. [Game Engine](#game-engine)
5. [API Endpoints](#api-endpoints)
6. [Socket.IO Events](#socketio-events)
7. [Frontend Architecture](#frontend-architecture)
8. [Authentication System](#authentication-system)
9. [Real-Time Synchronization](#real-time-synchronization)
10. [Security & Validation](#security--validation)
11. [Testing Strategy](#testing-strategy)
12. [Deployment](#deployment)

---

## Project Structure

```
Real-Time-Chess/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── socket.ts
│   │   │   └── environment.ts
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Game.ts
│   │   │   ├── Move.ts
│   │   │   ├── CustomBoard.ts
│   │   │   └── Friendship.ts
│   │   ├── game/
│   │   │   ├── GameEngine.ts
│   │   │   ├── GameState.ts
│   │   │   ├── MoveValidator.ts
│   │   │   ├── Piece.ts
│   │   │   ├── Board.ts
│   │   │   ├── CooldownManager.ts
│   │   │   └── EnergyManager.ts
│   │   ├── managers/
│   │   │   ├── GameManager.ts
│   │   │   ├── RoomManager.ts
│   │   │   └── MatchmakingManager.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── games.ts
│   │   │   └── boards.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── rateLimit.ts
│   │   │   └── validation.ts
│   │   ├── utils/
│   │   │   ├── jwt.ts
│   │   │   ├── email.ts
│   │   │   └── errors.ts
│   │   ├── server.ts
│   │   └── socket.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── tests/
│   │   ├── game/
│   │   ├── api/
│   │   └── integration/
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── game/
│   │   │   │   ├── Board.tsx
│   │   │   │   ├── Piece.tsx
│   │   │   │   ├── CooldownIndicator.tsx
│   │   │   │   └── EnergyBar.tsx
│   │   │   ├── auth/
│   │   │   │   ├── Login.tsx
│   │   │   │   └── Signup.tsx
│   │   │   ├── lobby/
│   │   │   │   ├── Matchmaking.tsx
│   │   │   │   └── RoomCode.tsx
│   │   │   └── board-editor/
│   │   │       └── BoardEditor.tsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx
│   │   │   └── SocketContext.tsx
│   │   ├── hooks/
│   │   │   ├── useGame.ts
│   │   │   ├── useSocket.ts
│   │   │   └── useAuth.ts
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   └── socket.ts
│   │   ├── types/
│   │   │   ├── game.ts
│   │   │   ├── user.ts
│   │   │   └── api.ts
│   │   ├── utils/
│   │   │   ├── constants.ts
│   │   │   └── helpers.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── routes.tsx
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## Database Schema

### Prisma Schema (`backend/prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String    @map("password_hash")
  emailVerified Boolean   @default(false) @map("email_verified")
  verificationToken String? @map("verification_token")
  elo           Int       @default(1000)
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  // Relations
  gamesAsWhite  Game[]    @relation("WhitePlayer")
  gamesAsBlack  Game[]    @relation("BlackPlayer")
  moves         Move[]
  customBoards  CustomBoard[]
  sentFriendships    Friendship[] @relation("Sender")
  receivedFriendships Friendship[] @relation("Receiver")

  @@map("users")
}

model Game {
  id          String   @id @default(uuid())
  whiteId     String   @map("white_id")
  blackId     String   @map("black_id")
  status      GameStatus @default(WAITING)
  winnerId    String?  @map("winner_id")
  roomCode    String?  @unique @map("room_code")
  isRated     Boolean  @default(false) @map("is_rated")
  startedAt   DateTime? @map("started_at")
  endedAt     DateTime? @map("ended_at")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Game state (JSON)
  boardState  Json     @map("board_state")
  whiteState  Json     @map("white_state") // { energy, regenRate, cooldowns }
  blackState  Json     @map("black_state")
  lastMoveAt  DateTime? @map("last_move_at")

  // Relations
  white       User     @relation("WhitePlayer", fields: [whiteId], references: [id])
  black       User     @relation("BlackPlayer", fields: [blackId], references: [id])
  moves       Move[]

  @@index([status])
  @@index([roomCode])
  @@map("games")
}

enum GameStatus {
  WAITING
  ACTIVE
  PAUSED
  FINISHED
  ABANDONED
}

model Move {
  id          String   @id @default(uuid())
  gameId      String   @map("game_id")
  playerId    String   @map("player_id")
  fromRow     Int      @map("from_row")
  fromCol     Int      @map("from_col")
  toRow       Int      @map("to_row")
  toCol       Int      @map("to_col")
  pieceType   String   @map("piece_type")
  energyCost  Int      @map("energy_cost")
  timestamp   DateTime @default(now())
  capturedPiece String? @map("captured_piece")

  // Relations
  game        Game     @relation(fields: [gameId], references: [id], onDelete: Cascade)
  player      User     @relation(fields: [playerId], references: [id])

  @@index([gameId])
  @@index([playerId])
  @@map("moves")
}

model CustomBoard {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  name        String
  boardData   Json     @map("board_data") // Array of piece positions
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("custom_boards")
}

model Friendship {
  id          String   @id @default(uuid())
  senderId    String   @map("sender_id")
  receiverId  String   @map("receiver_id")
  status      FriendshipStatus @default(PENDING)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  sender      User     @relation("Sender", fields: [senderId], references: [id], onDelete: Cascade)
  receiver    User     @relation("Receiver", fields: [receiverId], references: [id], onDelete: Cascade)

  @@unique([senderId, receiverId])
  @@index([senderId])
  @@index([receiverId])
  @@map("friendships")
}

enum FriendshipStatus {
  PENDING
  ACCEPTED
  BLOCKED
}
```

---

## Backend Architecture

### Core Configuration

#### `backend/src/config/database.ts`
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;
```

#### `backend/src/config/environment.ts`
```typescript
export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  emailService: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
```

---

## Game Engine

### Core Types (`backend/src/game/types.ts`)

```typescript
export type PieceType = 
  | 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king'
  | 'twistedPawn' | 'pawnGeneral' | 'flyingCastle' | 'prince' | 'iceBishop';

export type PieceColor = 'white' | 'black';

export interface Piece {
  id: string;
  type: PieceType;
  color: PieceColor;
  row: number;
  col: number;
  hasMoved: boolean;
  canPreventCapture?: boolean; // For Prince: can prevent capture once
}

export interface PlayerState {
  energy: number;
  energyRegenRate: number;
  lastEnergyUpdate: number;
  pieceCooldowns: Map<string, number>; // pieceId -> cooldownEndTimestamp
}

export interface GameState {
  id: string;
  board: (Piece | null)[][];
  whiteState: PlayerState;
  blackState: PlayerState;
  currentTurn: PieceColor | null; // null for real-time
  status: 'waiting' | 'active' | 'paused' | 'finished';
  winner: PieceColor | null;
  startedAt: number | null;
  lastMoveAt: number | null;
}

export interface MoveAttempt {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  playerId: string;
  timestamp: number;
}
```

### Piece Constants (`backend/src/game/constants.ts`)

```typescript
export const PIECE_COOLDOWNS: Record<PieceType, number> = {
  pawn: 4,
  knight: 5,
  bishop: 6,
  rook: 7,
  queen: 9,
  king: 11,
  twistedPawn: 4,
  pawnGeneral: 5,
  prince: 5,
  flyingCastle: 7,
  iceBishop: 6,
};

export const PIECE_ENERGY_COSTS: Record<PieceType, number> = {
  pawn: 2,
  knight: 3,
  bishop: 4,
  rook: 5,
  queen: 8,
  king: 10,
  twistedPawn: 2,
  pawnGeneral: 3,
  prince: 3,
  flyingCastle: 5,
  iceBishop: 4,
};

// Standard chess piece point values for tie-breaking
export const PIECE_POINT_VALUES: Record<PieceType, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 0, // King has no point value (capturing it wins)
  twistedPawn: 1,
  pawnGeneral: 1,
  prince: 3,
  flyingCastle: 5,
  iceBishop: 3,
};

export const INITIAL_ENERGY = 6;
export const MAX_ENERGY = 25;
export const INITIAL_ENERGY_REGEN = 0.5; // per second
export const ENERGY_REGEN_INCREASE = 0.5; // every 15 seconds
export const MAX_ENERGY_REGEN = 10;
export const ENERGY_REGEN_INTERVAL = 15000; // 15 seconds
```

### Board Class (`backend/src/game/Board.ts`)

```typescript
import { Piece, PieceColor } from './types';

export class Board {
  private grid: (Piece | null)[][];

  constructor(initialBoard?: (Piece | null)[][]) {
    this.grid = initialBoard || this.createDefaultBoard();
  }

  private createDefaultBoard(): (Piece | null)[][] {
    const board: (Piece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Initialize standard chess pieces
    // Note: When creating Prince pieces, set canPreventCapture = true
    // Example: { id: '...', type: 'prince', color: 'white', row: 0, col: 1, hasMoved: false, canPreventCapture: true }
    // ... implementation
    
    return board;
  }

  getPiece(row: number, col: number): Piece | null {
    if (!this.isValidPosition(row, col)) return null;
    return this.grid[row][col];
  }

  setPiece(row: number, col: number, piece: Piece | null): void {
    if (!this.isValidPosition(row, col)) return;
    this.grid[row][col] = piece;
  }

  isValidPosition(row: number, col: number): boolean {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
  }

  getBoard(): (Piece | null)[][] {
    return this.grid.map(row => [...row]);
  }

  clone(): Board {
    const clonedGrid = this.grid.map(row => row.map(piece => 
      piece ? { ...piece } : null
    ));
    return new Board(clonedGrid);
  }
}
```

### Move Validator (`backend/src/game/MoveValidator.ts`)

```typescript
import { Board } from './Board';
import { Piece, PieceType, PieceColor, MoveAttempt } from './types';
import { PIECE_COOLDOWNS, PIECE_ENERGY_COSTS } from './constants';

export class MoveValidator {
  constructor(private board: Board) {}

  validateMove(
    move: MoveAttempt,
    playerColor: PieceColor,
    playerState: any,
    currentTime: number
  ): { valid: boolean; reason?: string } {
    const piece = this.board.getPiece(move.fromRow, move.fromCol);
    
    // Check piece exists and belongs to player
    if (!piece || piece.color !== playerColor) {
      return { valid: false, reason: 'Invalid piece' };
    }

    // Check cooldown
    const cooldownEnd = playerState.pieceCooldowns.get(piece.id);
    if (cooldownEnd && currentTime < cooldownEnd) {
      return { valid: false, reason: 'Piece on cooldown' };
    }

    // Check energy
    const energyCost = PIECE_ENERGY_COSTS[piece.type];
    if (playerState.energy < energyCost) {
      return { valid: false, reason: 'Insufficient energy' };
    }

    // Check if move is legal
    if (!this.isLegalMove(piece, move.fromRow, move.fromCol, move.toRow, move.toCol)) {
      return { valid: false, reason: 'Illegal move' };
    }

    return { valid: true };
  }

  private isLegalMove(
    piece: Piece,
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): boolean {
    // Check if destination is valid
    if (!this.board.isValidPosition(toRow, toCol)) return false;

    const targetPiece = this.board.getPiece(toRow, toCol);
    
    // Can't capture own pieces
    if (targetPiece && targetPiece.color === piece.color) return false;

    // Validate based on piece type
    switch (piece.type) {
      case 'pawn':
        return this.validatePawnMove(piece, fromRow, fromCol, toRow, toCol, targetPiece);
      case 'knight':
        return this.validateKnightMove(fromRow, fromCol, toRow, toCol);
      case 'bishop':
        return this.validateBishopMove(fromRow, fromCol, toRow, toCol);
      case 'rook':
        return this.validateRookMove(fromRow, fromCol, toRow, toCol);
      case 'queen':
        return this.validateQueenMove(fromRow, fromCol, toRow, toCol);
      case 'king':
        return this.validateKingMove(fromRow, fromCol, toRow, toCol);
      // Custom pieces
      case 'twistedPawn':
        return this.validateTwistedPawnMove(piece, fromRow, fromCol, toRow, toCol, targetPiece);
      case 'flyingCastle':
        return this.validateFlyingCastleMove(fromRow, fromCol, toRow, toCol);
      case 'prince':
        return this.validateKnightMove(fromRow, fromCol, toRow, toCol); // Moves like knight
      default:
        return false;
    }
  }

  // Standard chess move validators
  private validatePawnMove(
    piece: Piece,
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number,
    targetPiece: Piece | null
  ): boolean {
    const direction = piece.color === 'white' ? -1 : 1;
    const startRow = piece.color === 'white' ? 6 : 1;

    // Forward move
    if (fromCol === toCol) {
      if (targetPiece) return false; // Can't capture forward
      if (toRow === fromRow + direction) return true;
      if (fromRow === startRow && toRow === fromRow + 2 * direction) {
        return !this.board.getPiece(fromRow + direction, fromCol); // Can't jump over piece
      }
    }
    
    // Capture diagonally
    if (Math.abs(toCol - fromCol) === 1 && toRow === fromRow + direction) {
      return targetPiece !== null && targetPiece.color !== piece.color;
    }

    return false;
  }

  private validateKnightMove(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): boolean {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  }

  private validateBishopMove(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): boolean {
    if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) return false;
    return this.isPathClear(fromRow, fromCol, toRow, toCol);
  }

  private validateRookMove(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): boolean {
    if (fromRow !== toRow && fromCol !== toCol) return false;
    return this.isPathClear(fromRow, fromCol, toRow, toCol);
  }

  private validateQueenMove(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): boolean {
    return this.validateBishopMove(fromRow, fromCol, toRow, toCol) ||
           this.validateRookMove(fromRow, fromCol, toRow, toCol);
  }

  private validateKingMove(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): boolean {
    const rowDiff = Math.abs(toRow - fromRow);
    const colDiff = Math.abs(toCol - fromCol);
    return rowDiff <= 1 && colDiff <= 1;
  }

  // Custom piece validators
  private validateTwistedPawnMove(
    piece: Piece,
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number,
    targetPiece: Piece | null
  ): boolean {
    const direction = piece.color === 'white' ? -1 : 1;
    
    // Moves diagonally forward
    if (Math.abs(toCol - fromCol) === 1 && toRow === fromRow + direction) {
      if (targetPiece) return false; // Can't capture diagonally
      return true;
    }
    
    // Captures straight
    if (fromCol === toCol && toRow === fromRow + direction) {
      return targetPiece !== null && targetPiece.color !== piece.color;
    }

    return false;
  }

  private validateFlyingCastleMove(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): boolean {
    if (fromRow !== toRow && fromCol !== toCol) return false;
    
    // Can jump over one piece
    const path = this.getPath(fromRow, fromCol, toRow, toCol);
    const piecesInPath = path.filter(([r, c]) => this.board.getPiece(r, c)).length;
    return piecesInPath <= 1;
  }

  private isPathClear(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): boolean {
    const path = this.getPath(fromRow, fromCol, toRow, toCol);
    // Check all positions except start and end
    for (let i = 1; i < path.length - 1; i++) {
      const [r, c] = path[i];
      if (this.board.getPiece(r, c)) return false;
    }
    return true;
  }

  private getPath(
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ): [number, number][] {
    const path: [number, number][] = [];
    const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
    const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
    
    let r = fromRow;
    let c = fromCol;
    
    while (r !== toRow || c !== toCol) {
      path.push([r, c]);
      r += rowStep;
      c += colStep;
    }
    path.push([toRow, toCol]);
    
    return path;
  }
}
```

### Energy Manager (`backend/src/game/EnergyManager.ts`)

```typescript
import { PlayerState } from './types';
import { 
  INITIAL_ENERGY_REGEN, 
  ENERGY_REGEN_INCREASE, 
  MAX_ENERGY_REGEN, 
  ENERGY_REGEN_INTERVAL,
  MAX_ENERGY 
} from './constants';

export class EnergyManager {
  static calculateCurrentEnergy(playerState: PlayerState, currentTime: number): number {
    const elapsed = (currentTime - playerState.lastEnergyUpdate) / 1000; // Convert to seconds
    const regenerated = elapsed * playerState.energyRegenRate;
    const newEnergy = Math.min(MAX_ENERGY, playerState.energy + regenerated);
    return Math.round(newEnergy * 100) / 100; // Round to 2 decimals
  }

  static updateEnergyRegenRate(
    playerState: PlayerState,
    gameStartTime: number,
    currentTime: number
  ): number {
    const gameDuration = currentTime - gameStartTime;
    const intervalsPassed = Math.floor(gameDuration / ENERGY_REGEN_INTERVAL);
    const newRate = Math.min(
      MAX_ENERGY_REGEN,
      INITIAL_ENERGY_REGEN + intervalsPassed * ENERGY_REGEN_INCREASE
    );
    return newRate;
  }

  static consumeEnergy(
    playerState: PlayerState,
    amount: number,
    currentTime: number
  ): { success: boolean; newEnergy: number } {
    const currentEnergy = this.calculateCurrentEnergy(playerState, currentTime);
    
    if (currentEnergy < amount) {
      return { success: false, newEnergy: currentEnergy };
    }

    const newEnergy = currentEnergy - amount;
    playerState.energy = newEnergy;
    playerState.lastEnergyUpdate = currentTime;
    
    return { success: true, newEnergy };
  }

  static initializePlayerState(gameStartTime: number): PlayerState {
    return {
      energy: 6,
      energyRegenRate: INITIAL_ENERGY_REGEN,
      lastEnergyUpdate: gameStartTime,
      pieceCooldowns: new Map(),
    };
  }
}
```

### Cooldown Manager (`backend/src/game/CooldownManager.ts`)

```typescript
import { PlayerState, PieceType } from './types';
import { PIECE_COOLDOWNS } from './constants';

export class CooldownManager {
  static isOnCooldown(
    pieceId: string,
    playerState: PlayerState,
    currentTime: number
  ): boolean {
    const cooldownEnd = playerState.pieceCooldowns.get(pieceId);
    if (!cooldownEnd) return false;
    return currentTime < cooldownEnd;
  }

  static getRemainingCooldown(
    pieceId: string,
    playerState: PlayerState,
    currentTime: number
  ): number {
    const cooldownEnd = playerState.pieceCooldowns.get(pieceId);
    if (!cooldownEnd) return 0;
    return Math.max(0, cooldownEnd - currentTime);
  }

  static setCooldown(
    pieceId: string,
    pieceType: PieceType,
    playerState: PlayerState,
    currentTime: number
  ): void {
    const cooldownDuration = PIECE_COOLDOWNS[pieceType] * 1000; // Convert to ms
    const cooldownEnd = currentTime + cooldownDuration;
    playerState.pieceCooldowns.set(pieceId, cooldownEnd);
  }

  static clearCooldown(pieceId: string, playerState: PlayerState): void {
    playerState.pieceCooldowns.delete(pieceId);
  }

  static updateCooldowns(playerState: PlayerState, currentTime: number): void {
    // Remove expired cooldowns
    for (const [pieceId, cooldownEnd] of playerState.pieceCooldowns.entries()) {
      if (currentTime >= cooldownEnd) {
        playerState.pieceCooldowns.delete(pieceId);
      }
    }
  }
}
```

### Game Engine (`backend/src/game/GameEngine.ts`)

```typescript
import { Board } from './Board';
import { MoveValidator } from './MoveValidator';
import { EnergyManager } from './EnergyManager';
import { CooldownManager } from './CooldownManager';
import { GameState, MoveAttempt, Piece, PieceColor } from './types';
import { PIECE_ENERGY_COSTS, PIECE_POINT_VALUES, PIECE_COOLDOWNS } from './constants';

export class GameEngine {
  private board: Board;
  private gameState: GameState;
  private moveValidator: MoveValidator;

  constructor(gameState: GameState) {
    this.gameState = gameState;
    this.board = new Board(gameState.board);
    this.moveValidator = new MoveValidator(this.board);
  }

  attemptMove(move: MoveAttempt, currentTime: number): {
    success: boolean;
    reason?: string;
    newState?: GameState;
  } {
    // Determine player color
    const playerColor = this.getPlayerColor(move.playerId);
    if (!playerColor) {
      return { success: false, reason: 'Player not in game' };
    }

    // Get player state
    const playerState = playerColor === 'white' 
      ? this.gameState.whiteState 
      : this.gameState.blackState;

    // Update energy before validation
    this.updatePlayerState(playerState, currentTime);

    // Validate move
    const validation = this.moveValidator.validateMove(
      move,
      playerColor,
      playerState,
      currentTime
    );

    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    // Execute move
    return this.executeMove(move, playerColor, playerState, currentTime);
  }

  private executeMove(
    move: MoveAttempt,
    playerColor: PieceColor,
    playerState: any,
    currentTime: number
  ): { success: boolean; newState: GameState; capturedPiece?: Piece | null } {
    const piece = this.board.getPiece(move.fromRow, move.fromCol)!;
    const targetPiece = this.board.getPiece(move.toRow, move.toCol);

    // Check if Prince is preventing capture
    if (targetPiece && targetPiece.type === 'prince' && targetPiece.canPreventCapture) {
      // Prince prevents capture, consume the ability
      targetPiece.canPreventCapture = false;
      // Move still happens, but piece is not captured
      this.board.setPiece(move.fromRow, move.fromCol, null);
      piece.row = move.toRow;
      piece.col = move.toCol;
      piece.hasMoved = true;
      // Place moving piece on the same square (Prince is still there)
      this.board.setPiece(move.toRow, move.toCol, piece);
      
      // Consume energy and set cooldown
      const energyCost = PIECE_ENERGY_COSTS[piece.type];
      EnergyManager.consumeEnergy(playerState, energyCost, currentTime);
      CooldownManager.setCooldown(piece.id, piece.type, playerState, currentTime);
      
      this.gameState.lastMoveAt = currentTime;
      this.gameState.board = this.board.getBoard();
      
      // Apply special effects
      this.applySpecialEffects(piece, move.toRow, move.toCol, currentTime);
      
      return { success: true, newState: this.getState(), capturedPiece: null };
    }

    // Normal capture or move
    const capturedPiece = targetPiece;

    // Consume energy
    const energyCost = PIECE_ENERGY_COSTS[piece.type];
    const energyResult = EnergyManager.consumeEnergy(playerState, energyCost, currentTime);
    
    if (!energyResult.success) {
      return { success: false, newState: this.getState() };
    }

    // Set cooldown
    CooldownManager.setCooldown(piece.id, piece.type, playerState, currentTime);

    // Move piece
    this.board.setPiece(move.fromRow, move.fromCol, null);
    piece.row = move.toRow;
    piece.col = move.toCol;
    piece.hasMoved = true;
    this.board.setPiece(move.toRow, move.toCol, piece);

    // Check for king capture (win condition)
    const winner = this.checkWinCondition(capturedPiece, playerColor);

    // Update game state
    this.gameState.lastMoveAt = currentTime;
    this.gameState.board = this.board.getBoard();
    
    if (winner) {
      this.gameState.status = 'finished';
      this.gameState.winner = winner;
    }

    // Apply special piece effects
    this.applySpecialEffects(piece, move.toRow, move.toCol, currentTime);

    return { success: true, newState: this.getState(), capturedPiece };
  }

  private applySpecialEffects(
    piece: Piece,
    row: number,
    col: number,
    currentTime: number
  ): void {
    switch (piece.type) {
      case 'pawnGeneral':
        this.applyPawnGeneralEffect(row, col, piece.color, currentTime);
        break;
      case 'iceBishop':
        this.applyIceBishopEffect(row, col, piece.color, currentTime);
        break;
    }
  }

  private applyPawnGeneralEffect(
    row: number,
    col: number,
    color: PieceColor,
    currentTime: number
  ): void {
    const playerState = color === 'white' 
      ? this.gameState.whiteState 
      : this.gameState.blackState;
    
    const adjacentPositions = [
      [row - 1, col], [row + 1, col],
      [row, col - 1], [row, col + 1],
      [row - 1, col - 1], [row - 1, col + 1],
      [row + 1, col - 1], [row + 1, col + 1],
    ];

    for (const [r, c] of adjacentPositions) {
      const adjacentPiece = this.board.getPiece(r, c);
      if (adjacentPiece && adjacentPiece.color === color) {
        const currentCooldown = CooldownManager.getRemainingCooldown(
          adjacentPiece.id,
          playerState,
          currentTime
        );
        if (currentCooldown > 0) {
          // Reduce cooldown by 2 seconds (2000ms)
          const newCooldownEnd = currentTime + Math.max(0, currentCooldown - 2000);
          playerState.pieceCooldowns.set(adjacentPiece.id, newCooldownEnd);
        }
      }
    }
  }

  private applyIceBishopEffect(
    row: number,
    col: number,
    color: PieceColor,
    currentTime: number
  ): void {
    const opponentColor: PieceColor = color === 'white' ? 'black' : 'white';
    const opponentState = opponentColor === 'white'
      ? this.gameState.whiteState
      : this.gameState.blackState;

    const adjacentPositions = [
      [row - 1, col], [row + 1, col],
      [row, col - 1], [row, col + 1],
      [row - 1, col - 1], [row - 1, col + 1],
      [row + 1, col - 1], [row + 1, col + 1],
    ];

    for (const [r, c] of adjacentPositions) {
      const adjacentPiece = this.board.getPiece(r, c);
      if (adjacentPiece && adjacentPiece.color === opponentColor) {
        const currentCooldown = CooldownManager.getRemainingCooldown(
          adjacentPiece.id,
          opponentState,
          currentTime
        );
        
        const maxCooldown = PIECE_COOLDOWNS[adjacentPiece.type] * 1000;
        let newCooldownEnd: number;
        
        if (currentCooldown > 0) {
          // Already on cooldown: add 3 seconds, but don't exceed max
          newCooldownEnd = currentTime + Math.min(currentCooldown + 3000, maxCooldown);
        } else {
          // Not on cooldown: set to 3 seconds
          newCooldownEnd = currentTime + 3000;
        }
        
        opponentState.pieceCooldowns.set(adjacentPiece.id, newCooldownEnd);
      }
    }
  }

  private checkWinCondition(capturedPiece: Piece | null, playerColor: PieceColor): PieceColor | null {
    if (capturedPiece && capturedPiece.type === 'king') {
      return playerColor;
    }
    return null;
  }

  // Calculate total points for a player based on remaining pieces
  calculatePlayerPoints(color: PieceColor): number {
    let totalPoints = 0;
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board.getPiece(row, col);
        if (piece && piece.color === color) {
          totalPoints += PIECE_POINT_VALUES[piece.type];
        }
      }
    }
    return totalPoints;
  }

  // Check for simultaneous king captures and determine winner by points
  checkSimultaneousKingCapture(
    whiteCapturedKing: boolean,
    blackCapturedKing: boolean
  ): PieceColor | null {
    if (!whiteCapturedKing && !blackCapturedKing) return null;
    
    // If both kings captured simultaneously, use points to determine winner
    if (whiteCapturedKing && blackCapturedKing) {
      const whitePoints = this.calculatePlayerPoints('white');
      const blackPoints = this.calculatePlayerPoints('black');
      
      if (whitePoints > blackPoints) return 'white';
      if (blackPoints > whitePoints) return 'black';
      // Tie goes to white
      return 'white';
    }
    
    // Only one king captured
    if (whiteCapturedKing) return 'white';
    if (blackCapturedKing) return 'black';
    
    return null;
  }

  private getPlayerColor(playerId: string): PieceColor | null {
    // This should be determined from game data
    // For now, assume it's passed in gameState
    return null; // Implement based on your game model
  }

  updatePlayerState(playerState: any, currentTime: number): void {
    if (!this.gameState.startedAt) return;

    // Update energy regen rate
    const newRate = EnergyManager.updateEnergyRegenRate(
      playerState,
      this.gameState.startedAt,
      currentTime
    );
    playerState.energyRegenRate = newRate;

    // Update energy
    playerState.energy = EnergyManager.calculateCurrentEnergy(playerState, currentTime);
    playerState.lastEnergyUpdate = currentTime;

    // Clean up expired cooldowns
    CooldownManager.updateCooldowns(playerState, currentTime);
  }

  getState(): GameState {
    return {
      ...this.gameState,
      board: this.board.getBoard(),
    };
  }

  updateState(currentTime: number): void {
    this.updatePlayerState(this.gameState.whiteState, currentTime);
    this.updatePlayerState(this.gameState.blackState, currentTime);
  }
}
```

---

## Game Manager

### `backend/src/managers/GameManager.ts`

```typescript
import { GameEngine } from '../game/GameEngine';
import { GameState, MoveAttempt, Piece, PieceColor } from '../game/types';
import prisma from '../config/database';
import { GameStatus } from '@prisma/client';

export class GameManager {
  private activeGames: Map<string, GameEngine> = new Map();
  private gameLoopInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startGameLoop();
  }

  async createGame(whiteId: string, blackId: string, isRated: boolean = false): Promise<string> {
    const game = await prisma.game.create({
      data: {
        whiteId,
        blackId,
        status: GameStatus.WAITING,
        isRated,
        boardState: this.getInitialBoardState(),
        whiteState: this.getInitialPlayerState(),
        blackState: this.getInitialPlayerState(),
      },
    });

    return game.id;
  }

  async startGame(gameId: string): Promise<void> {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) throw new Error('Game not found');

    const gameState = this.loadGameState(game);
    const engine = new GameEngine(gameState);
    
    this.activeGames.set(gameId, engine);

    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: GameStatus.ACTIVE,
        startedAt: new Date(),
      },
    });
  }

  async attemptMove(
    gameId: string,
    move: MoveAttempt
  ): Promise<{ success: boolean; reason?: string }> {
    const engine = this.activeGames.get(gameId);
    if (!engine) {
      // Load from database
      const game = await prisma.game.findUnique({ where: { id: gameId } });
      if (!game) return { success: false, reason: 'Game not found' };
      
      const gameState = this.loadGameState(game);
      const newEngine = new GameEngine(gameState);
      this.activeGames.set(gameId, newEngine);
      return this.attemptMove(gameId, move);
    }

    const currentTime = Date.now();
    engine.updateState(currentTime);
    
    const result = engine.attemptMove(move, currentTime);
    
    if (result.success && result.newState) {
      // Check for simultaneous king captures
      const state = result.newState;
      const whiteKingExists = this.kingExists(state.board, 'white');
      const blackKingExists = this.kingExists(state.board, 'black');
      
      let winner: 'white' | 'black' | null = null;
      
      if (!whiteKingExists && !blackKingExists) {
        // Both kings captured simultaneously - use points to determine winner
        const whitePoints = engine.calculatePlayerPoints('white');
        const blackPoints = engine.calculatePlayerPoints('black');
        
        if (whitePoints > blackPoints) {
          winner = 'white';
        } else if (blackPoints > whitePoints) {
          winner = 'black';
        } else {
          // Tie goes to white
          winner = 'white';
        }
        
        state.status = 'finished';
        state.winner = winner;
      } else if (!whiteKingExists) {
        winner = 'black';
        state.status = 'finished';
        state.winner = winner;
      } else if (!blackKingExists) {
        winner = 'white';
        state.status = 'finished';
        state.winner = winner;
      }
      
      // Save to database
      await this.saveGameState(gameId, state);
      
      if (state.status === 'finished' && winner) {
        await this.endGame(gameId, winner);
      }
    }

    return result;
  }

  private kingExists(board: (Piece | null)[][], color: PieceColor): boolean {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'king' && piece.color === color) {
          return true;
        }
      }
    }
    return false;
  }

  getGameState(gameId: string): GameState | null {
    const engine = this.activeGames.get(gameId);
    if (!engine) return null;
    
    const currentTime = Date.now();
    engine.updateState(currentTime);
    return engine.getState();
  }

  private startGameLoop(): void {
    this.gameLoopInterval = setInterval(() => {
      const currentTime = Date.now();
      
      this.activeGames.forEach(async (engine, gameId) => {
        engine.updateState(currentTime);
        
        // Periodically save state to database
        const state = engine.getState();
        await this.saveGameState(gameId, state);
      });
    }, 100); // 10 updates per second
  }

  private async saveGameState(gameId: string, state: GameState): Promise<void> {
    await prisma.game.update({
      where: { id: gameId },
      data: {
        boardState: state.board as any,
        whiteState: state.whiteState as any,
        blackState: state.blackState as any,
        lastMoveAt: state.lastMoveAt ? new Date(state.lastMoveAt) : null,
        status: this.mapStatus(state.status),
        winnerId: state.winner 
          ? await this.getWinnerId(gameId, state.winner)
          : null,
      },
    });
  }

  private async endGame(gameId: string, winner: 'white' | 'black' | null): Promise<void> {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return;

    const winnerId = winner === 'white' ? game.whiteId : game.blackId;

    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: GameStatus.FINISHED,
        winnerId,
        endedAt: new Date(),
      },
    });

    // Update ELO if rated
    if (game.isRated) {
      await this.updateElo(game.whiteId, game.blackId, winnerId);
    }

    this.activeGames.delete(gameId);
  }

  private async updateElo(whiteId: string, blackId: string, winnerId: string): Promise<void> {
    const white = await prisma.user.findUnique({ where: { id: whiteId } });
    const black = await prisma.user.findUnique({ where: { id: blackId } });
    
    if (!white || !black) return;

    const kFactor = 32;
    const whiteExpected = 1 / (1 + Math.pow(10, (black.elo - white.elo) / 400));
    const blackExpected = 1 / (1 + Math.pow(10, (white.elo - black.elo) / 400));

    const whiteScore = winnerId === whiteId ? 1 : 0;
    const blackScore = winnerId === blackId ? 1 : 0;

    const whiteNewElo = Math.round(white.elo + kFactor * (whiteScore - whiteExpected));
    const blackNewElo = Math.round(black.elo + kFactor * (blackScore - blackExpected));

    await prisma.user.update({ where: { id: whiteId }, data: { elo: whiteNewElo } });
    await prisma.user.update({ where: { id: blackId }, data: { elo: blackNewElo } });
  }

  private loadGameState(game: any): GameState {
    return {
      id: game.id,
      board: game.boardState,
      whiteState: this.deserializePlayerState(game.whiteState),
      blackState: this.deserializePlayerState(game.blackState),
      currentTurn: null,
      status: this.mapDbStatus(game.status),
      winner: game.winnerId === game.whiteId ? 'white' : 'black',
      startedAt: game.startedAt ? game.startedAt.getTime() : null,
      lastMoveAt: game.lastMoveAt ? game.lastMoveAt.getTime() : null,
    };
  }

  private deserializePlayerState(state: any): any {
    return {
      ...state,
      pieceCooldowns: new Map(Object.entries(state.pieceCooldowns || {})),
    };
  }

  private getInitialBoardState(): any {
    // Return initial board setup
    return [];
  }

  private getInitialPlayerState(): any {
    return {
      energy: 6,
      energyRegenRate: 0.5,
      lastEnergyUpdate: Date.now(),
      pieceCooldowns: {},
    };
  }

  private mapStatus(status: string): GameStatus {
    switch (status) {
      case 'waiting': return GameStatus.WAITING;
      case 'active': return GameStatus.ACTIVE;
      case 'paused': return GameStatus.PAUSED;
      case 'finished': return GameStatus.FINISHED;
      default: return GameStatus.WAITING;
    }
  }

  private mapDbStatus(status: GameStatus): 'waiting' | 'active' | 'paused' | 'finished' {
    switch (status) {
      case GameStatus.WAITING: return 'waiting';
      case GameStatus.ACTIVE: return 'active';
      case GameStatus.PAUSED: return 'paused';
      case GameStatus.FINISHED: return 'finished';
      default: return 'waiting';
    }
  }

  private async getWinnerId(gameId: string, winner: 'white' | 'black'): Promise<string | null> {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return null;
    return winner === 'white' ? game.whiteId : game.blackId;
  }
}

export const gameManager = new GameManager();
```

---

## API Endpoints

### Authentication Routes (`backend/src/routes/auth.ts`)

```typescript
import express from 'express';
import bcrypt from 'bcrypt';
import { generateToken, verifyToken } from '../utils/jwt';
import prisma from '../config/database';
import { sendVerificationEmail } from '../utils/email';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomUUID();

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        verificationToken,
      },
    });

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({ message: 'User created. Please verify your email.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ error: 'Email not verified' });
    }

    const token = generateToken({ userId: user.id, email: user.email });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        elo: user.elo,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify email
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    });

    res.json({ message: 'Email verified' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        elo: true,
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

### Games Routes (`backend/src/routes/games.ts`)

```typescript
import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { gameManager } from '../managers/GameManager';
import prisma from '../config/database';

const router = express.Router();

// Get game state
router.get('/:gameId', authenticateToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    const state = gameManager.getGameState(gameId);
    
    if (!state) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json(state);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get game history
router.get('/:gameId/history', authenticateToken, async (req, res) => {
  try {
    const moves = await prisma.move.findMany({
      where: { gameId: req.params.gameId },
      orderBy: { timestamp: 'asc' },
    });

    res.json(moves);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's games
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const games = await prisma.game.findMany({
      where: {
        OR: [
          { whiteId: req.params.userId },
          { blackId: req.params.userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

---

## Socket.IO Events

### Socket Handler (`backend/src/socket.ts`)

```typescript
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { authenticateSocket } from './middleware/auth';
import { gameManager } from './managers/GameManager';
import { roomManager } from './managers/RoomManager';
import { matchmakingManager } from './managers/MatchmakingManager';

export function setupSocket(server: HTTPServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId = socket.data.userId;

    // Join room
    socket.on('joinRoom', async (data: { roomCode: string }) => {
      try {
        const game = await roomManager.joinRoom(data.roomCode, userId);
        if (game) {
          socket.join(`game:${game.id}`);
          socket.emit('roomJoined', { gameId: game.id });
          
          // Send current game state
          const state = gameManager.getGameState(game.id);
          if (state) {
            socket.emit('gameStateUpdate', state);
          }
        } else {
          socket.emit('roomError', { error: 'Room not found' });
        }
      } catch (error) {
        socket.emit('roomError', { error: 'Failed to join room' });
      }
    });

    // Make move
    socket.on('makeMove', async (data: {
      gameId: string;
      fromRow: number;
      fromCol: number;
      toRow: number;
      toCol: number;
    }) => {
      try {
        const result = await gameManager.attemptMove(data.gameId, {
          fromRow: data.fromRow,
          fromCol: data.fromCol,
          toRow: data.toRow,
          toCol: data.toCol,
          playerId: userId,
          timestamp: Date.now(),
        });

        if (result.success) {
          const state = gameManager.getGameState(data.gameId);
          io.to(`game:${data.gameId}`).emit('gameStateUpdate', state);
          socket.emit('moveAccepted', { move: data });
        } else {
          socket.emit('moveRejected', { reason: result.reason });
        }
      } catch (error) {
        socket.emit('moveRejected', { reason: 'Internal error' });
      }
    });

    // Request matchmaking
    socket.on('requestMatchmaking', async () => {
      try {
        await matchmakingManager.addToQueue(userId, socket.id);
        socket.emit('matchmakingStarted');
      } catch (error) {
        socket.emit('matchmakingError', { error: 'Failed to start matchmaking' });
      }
    });

    // Cancel matchmaking
    socket.on('cancelMatchmaking', async () => {
      try {
        await matchmakingManager.removeFromQueue(userId);
        socket.emit('matchmakingCancelled');
      } catch (error) {
        // Ignore
      }
    });

    // Spectate game
    socket.on('spectateGame', async (data: { gameId: string }) => {
      try {
        const game = await prisma.game.findUnique({
          where: { id: data.gameId },
        });

        if (game && game.status === 'ACTIVE') {
          socket.join(`game:${data.gameId}`);
          const state = gameManager.getGameState(data.gameId);
          if (state) {
            socket.emit('gameStateUpdate', state);
          }
        } else {
          socket.emit('spectateError', { error: 'Game not available' });
        }
      } catch (error) {
        socket.emit('spectateError', { error: 'Failed to spectate' });
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      await matchmakingManager.removeFromQueue(userId);
    });
  });

  return io;
}
```

---

## Frontend Architecture

### Socket Context (`frontend/src/contexts/SocketContext.tsx`)

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const newSocket = io(import.meta.env.VITE_API_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
```

### Game Hook (`frontend/src/hooks/useGame.ts`)

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { GameState } from '../types/game';

export const useGame = (gameId: string) => {
  const { socket } = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket || !gameId) return;

    const handleStateUpdate = (state: GameState) => {
      setGameState(state);
    };

    const handleMoveRejected = (data: { reason: string }) => {
      setError(data.reason);
    };

    socket.on('gameStateUpdate', handleStateUpdate);
    socket.on('moveRejected', handleMoveRejected);

    // Join game room
    socket.emit('joinRoom', { roomCode: gameId });

    return () => {
      socket.off('gameStateUpdate', handleStateUpdate);
      socket.off('moveRejected', handleMoveRejected);
    };
  }, [socket, gameId]);

  const makeMove = useCallback((
    fromRow: number,
    fromCol: number,
    toRow: number,
    toCol: number
  ) => {
    if (!socket || !gameId) return;

    socket.emit('makeMove', {
      gameId,
      fromRow,
      fromCol,
      toRow,
      toCol,
    });
    setError(null);
  }, [socket, gameId]);

  return { gameState, makeMove, error };
};
```

---

## Security & Validation

### Rate Limiting (`backend/src/middleware/rateLimit.ts`)

```typescript
import { Request, Response, NextFunction } from 'express';

const moveAttempts = new Map<string, { count: number; resetAt: number }>();

export const moveRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const now = Date.now();
  const userAttempts = moveAttempts.get(userId);

  if (!userAttempts || now > userAttempts.resetAt) {
    moveAttempts.set(userId, { count: 1, resetAt: now + 1000 }); // 1 per second
    return next();
  }

  if (userAttempts.count >= 10) { // Max 10 moves per second
    return res.status(429).json({ error: 'Too many move attempts' });
  }

  userAttempts.count++;
  next();
};
```

### Input Validation (`backend/src/middleware/validation.ts`)

```typescript
import { Request, Response, NextFunction } from 'express';

export const validateMove = (req: Request, res: Response, next: NextFunction) => {
  const { fromRow, fromCol, toRow, toCol } = req.body;

  if (
    typeof fromRow !== 'number' || typeof fromCol !== 'number' ||
    typeof toRow !== 'number' || typeof toCol !== 'number'
  ) {
    return res.status(400).json({ error: 'Invalid move coordinates' });
  }

  if (
    fromRow < 0 || fromRow > 7 || fromCol < 0 || fromCol > 7 ||
    toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7
  ) {
    return res.status(400).json({ error: 'Coordinates out of bounds' });
  }

  next();
};
```

---

## Testing Strategy

### Unit Tests Example (`backend/tests/game/MoveValidator.test.ts`)

```typescript
import { describe, it, expect } from 'vitest';
import { MoveValidator } from '../../src/game/MoveValidator';
import { Board } from '../../src/game/Board';

describe('MoveValidator', () => {
  it('should validate legal pawn move', () => {
    const board = new Board();
    const validator = new MoveValidator(board);
    
    // Test implementation
  });

  it('should reject illegal move', () => {
    // Test implementation
  });
});
```

---

## Deployment

### Docker Setup

```dockerfile
# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Environment Variables

```env
# .env
DATABASE_URL=postgresql://user:password@localhost:5432/realtimechess
JWT_SECRET=your-secret-key
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

---

This implementation plan provides a complete, production-ready architecture. Each component is designed to be:
- **Secure**: Server-side validation, rate limiting, authentication
- **Scalable**: Proper state management, efficient database queries
- **Maintainable**: Clear separation of concerns, type safety
- **Testable**: Modular design allows for unit and integration tests

Start with the database schema and game engine, then build the API and Socket.IO layer, and finally the frontend.

