import { Piece, PieceColor } from './types';
import { BOARD_SIZE, ROWS, COLS } from './constants';

/**
 * Board class managing the 8x8 chess board state
 */
export class Board {
  private grid: (Piece | null)[][];

  /**
   * Creates a new board instance
   * @param initialBoard - Optional initial board configuration (8x8 array)
   */
  constructor(initialBoard?: (Piece | null)[][]) {
    if (initialBoard) {
      // Validate initial board size
      if (initialBoard.length !== ROWS) {
        throw new Error(`Board must have ${ROWS} rows, got ${initialBoard.length}`);
      }
      for (let row = 0; row < ROWS; row++) {
        if (!initialBoard[row] || initialBoard[row].length !== COLS) {
          throw new Error(`Row ${row} must have ${COLS} columns`);
        }
      }
      this.grid = initialBoard.map(row => row.map(piece => piece ? { ...piece } : null));
    } else {
      this.grid = this.createDefaultBoard();
    }
  }

  /**
   * Creates a standard chess starting position
   * White pieces on rows 6-7, Black pieces on rows 0-1
   */
  private createDefaultBoard(): (Piece | null)[][] {
    const board: (Piece | null)[][] = Array(ROWS)
      .fill(null)
      .map(() => Array(COLS).fill(null));

    // Helper function to generate unique piece IDs
    let pieceIdCounter = 0;
    const generatePieceId = (color: PieceColor, type: string) => {
      return `${color}-${type}-${pieceIdCounter++}`;
    };

    // White pieces (rows 6-7)
    // Row 7: Back rank pieces
    board[7][0] = {
      id: generatePieceId('white', 'rook'),
      type: 'rook',
      color: 'white',
      row: 7,
      col: 0,
      hasMoved: false,
    };
    board[7][1] = {
      id: generatePieceId('white', 'knight'),
      type: 'knight',
      color: 'white',
      row: 7,
      col: 1,
      hasMoved: false,
    };
    board[7][2] = {
      id: generatePieceId('white', 'bishop'),
      type: 'bishop',
      color: 'white',
      row: 7,
      col: 2,
      hasMoved: false,
    };
    board[7][3] = {
      id: generatePieceId('white', 'queen'),
      type: 'queen',
      color: 'white',
      row: 7,
      col: 3,
      hasMoved: false,
    };
    board[7][4] = {
      id: generatePieceId('white', 'king'),
      type: 'king',
      color: 'white',
      row: 7,
      col: 4,
      hasMoved: false,
    };
    board[7][5] = {
      id: generatePieceId('white', 'bishop'),
      type: 'bishop',
      color: 'white',
      row: 7,
      col: 5,
      hasMoved: false,
    };
    board[7][6] = {
      id: generatePieceId('white', 'knight'),
      type: 'knight',
      color: 'white',
      row: 7,
      col: 6,
      hasMoved: false,
    };
    board[7][7] = {
      id: generatePieceId('white', 'rook'),
      type: 'rook',
      color: 'white',
      row: 7,
      col: 7,
      hasMoved: false,
    };

    // Row 6: White pawns
    for (let col = 0; col < COLS; col++) {
      board[6][col] = {
        id: generatePieceId('white', 'pawn'),
        type: 'pawn',
        color: 'white',
        row: 6,
        col,
        hasMoved: false,
      };
    }

    // Black pieces (rows 0-1)
    // Row 0: Back rank pieces
    board[0][0] = {
      id: generatePieceId('black', 'rook'),
      type: 'rook',
      color: 'black',
      row: 0,
      col: 0,
      hasMoved: false,
    };
    board[0][1] = {
      id: generatePieceId('black', 'knight'),
      type: 'knight',
      color: 'black',
      row: 0,
      col: 1,
      hasMoved: false,
    };
    board[0][2] = {
      id: generatePieceId('black', 'bishop'),
      type: 'bishop',
      color: 'black',
      row: 0,
      col: 2,
      hasMoved: false,
    };
    board[0][3] = {
      id: generatePieceId('black', 'queen'),
      type: 'queen',
      color: 'black',
      row: 0,
      col: 3,
      hasMoved: false,
    };
    board[0][4] = {
      id: generatePieceId('black', 'king'),
      type: 'king',
      color: 'black',
      row: 0,
      col: 4,
      hasMoved: false,
    };
    board[0][5] = {
      id: generatePieceId('black', 'bishop'),
      type: 'bishop',
      color: 'black',
      row: 0,
      col: 5,
      hasMoved: false,
    };
    board[0][6] = {
      id: generatePieceId('black', 'knight'),
      type: 'knight',
      color: 'black',
      row: 0,
      col: 6,
      hasMoved: false,
    };
    board[0][7] = {
      id: generatePieceId('black', 'rook'),
      type: 'rook',
      color: 'black',
      row: 0,
      col: 7,
      hasMoved: false,
    };

    // Row 1: Black pawns
    for (let col = 0; col < COLS; col++) {
      board[1][col] = {
        id: generatePieceId('black', 'pawn'),
        type: 'pawn',
        color: 'black',
        row: 1,
        col,
        hasMoved: false,
      };
    }

    // Rows 2-5 remain empty
    return board;
  }

  /**
   * Gets the piece at the specified position
   * @param row - Row index (0-7)
   * @param col - Column index (0-7)
   * @returns The piece at the position, or null if empty or invalid position
   */
  getPiece(row: number, col: number): Piece | null {
    if (!this.isValidPosition(row, col)) {
      return null;
    }
    return this.grid[row][col];
  }

  /**
   * Sets a piece at the specified position
   * @param row - Row index (0-7)
   * @param col - Column index (0-7)
   * @param piece - The piece to place, or null to clear the square
   */
  setPiece(row: number, col: number, piece: Piece | null): void {
    if (!this.isValidPosition(row, col)) {
      return;
    }

    if (piece) {
      // Update piece position to match board position
      this.grid[row][col] = {
        ...piece,
        row,
        col,
      };
    } else {
      this.grid[row][col] = null;
    }
  }

  /**
   * Checks if a position is valid (within board bounds)
   * @param row - Row index
   * @param col - Column index
   * @returns true if the position is valid, false otherwise
   */
  isValidPosition(row: number, col: number): boolean {
    return row >= 0 && row < ROWS && col >= 0 && col < COLS;
  }

  /**
   * Gets a copy of the current board state
   * @returns A deep copy of the board grid
   */
  getBoard(): (Piece | null)[][] {
    return this.grid.map(row =>
      row.map(piece => (piece ? { ...piece } : null))
    );
  }

  /**
   * Creates a deep clone of the board
   * @returns A new Board instance with copied pieces
   */
  clone(): Board {
    const clonedGrid = this.grid.map(row =>
      row.map(piece => (piece ? { ...piece } : null))
    );
    return new Board(clonedGrid);
  }

  /**
   * Checks if a square is empty
   * @param row - Row index (0-7)
   * @param col - Column index (0-7)
   * @returns true if the square is empty, false if occupied or invalid position
   */
  isEmpty(row: number, col: number): boolean {
    if (!this.isValidPosition(row, col)) {
      return false; // Invalid positions are considered not empty
    }
    return this.getPiece(row, col) === null;
  }

  /**
   * Finds all pieces of a specific color on the board
   * @param color - The color to search for
   * @returns Array of pieces matching the color
   */
  findPiecesByColor(color: PieceColor): Piece[] {
    const pieces: Piece[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const piece = this.grid[row][col];
        if (piece && piece.color === color) {
          pieces.push(piece);
        }
      }
    }
    return pieces;
  }

  /**
   * Finds a piece by its ID
   * @param pieceId - The unique ID of the piece
   * @returns The piece if found, null otherwise
   */
  findPieceById(pieceId: string): Piece | null {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const piece = this.grid[row][col];
        if (piece && piece.id === pieceId) {
          return piece;
        }
      }
    }
    return null;
  }

  /**
   * Moves a piece from one position to another
   * Updates the piece's position and hasMoved flag
   * @param fromRow - Source row
   * @param fromCol - Source column
   * @param toRow - Destination row
   * @param toCol - Destination column
   * @returns true if move was successful, false otherwise
   */
  movePiece(fromRow: number, fromCol: number, toRow: number, toCol: number): boolean {
    const piece = this.getPiece(fromRow, fromCol);
    if (!piece) {
      return false;
    }

    // Update piece position and hasMoved flag
    const movedPiece: Piece = {
      ...piece,
      row: toRow,
      col: toCol,
      hasMoved: true,
    };

    // Clear source square and set destination
    this.setPiece(fromRow, fromCol, null);
    this.setPiece(toRow, toCol, movedPiece);

    return true;
  }

  /**
   * Clears the entire board (sets all squares to null)
   */
  clear(): void {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        this.grid[row][col] = null;
      }
    }
  }

  /**
   * Gets the board size
   * @returns The board size (always 8 for chess)
   */
  getSize(): number {
    return BOARD_SIZE;
  }
}

