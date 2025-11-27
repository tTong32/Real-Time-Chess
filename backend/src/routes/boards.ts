import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { ValidationError, NotFoundError, AuthorizationError } from '../utils/errors';
import prisma from '../config/database';
import { validateCustomBoard } from '../game/constraints';
import { PieceType } from '../game/types';

const router = express.Router();

/**
 * GET /api/boards
 * Get all custom boards for the authenticated user
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthorizationError('User ID not found in token');
    }

    const boards = await prisma.customBoard.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        boardData: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(boards);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/boards/:id
 * Get a specific custom board by ID
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthorizationError('User ID not found in token');
    }

    const { id } = req.params;

    const board = await prisma.customBoard.findUnique({
      where: { id },
    });

    if (!board) {
      throw new NotFoundError('Board not found');
    }

    // Check ownership
    if (board.userId !== req.userId) {
      throw new AuthorizationError('You do not have permission to access this board');
    }

    res.json({
      id: board.id,
      name: board.name,
      boardData: board.boardData,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/boards
 * Create a new custom board
 */
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthorizationError('User ID not found in token');
    }

    const { name, boardData } = req.body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('Board name is required');
    }

    if (!boardData) {
      throw new ValidationError('Board data is required');
    }

    // Validate board data is an array
    if (!Array.isArray(boardData)) {
      throw new ValidationError('Board data must be an array');
    }

    // Convert board data to 8x8 format for validation
    // If boardData is an array of piece objects, convert to 8x8 grid
    let boardGrid: (PieceType | null)[][];
    
    if (boardData.length === 8 && Array.isArray(boardData[0])) {
      // Already in 8x8 format
      boardGrid = boardData as (PieceType | null)[][];
    } else {
      // Convert from piece array to 8x8 grid
      boardGrid = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      
      for (const piece of boardData) {
        if (piece && piece.row !== undefined && piece.col !== undefined && piece.type) {
          if (piece.row >= 0 && piece.row < 8 && piece.col >= 0 && piece.col < 8) {
            boardGrid[piece.row][piece.col] = piece.type as PieceType;
          }
        }
      }
    }

    // Validate board configuration
    const validation = validateCustomBoard(boardGrid);
    if (!validation.valid) {
      throw new ValidationError(validation.error || 'Invalid board configuration');
    }

    // Create board
    const board = await prisma.customBoard.create({
      data: {
        userId: req.userId,
        name: name.trim(),
        boardData: boardData as any, // Store original format
      },
      select: {
        id: true,
        name: true,
        boardData: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(board);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/boards/:id
 * Update an existing custom board
 */
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthorizationError('User ID not found in token');
    }

    const { id } = req.params;
    const { name, boardData } = req.body;

    // Find board
    const board = await prisma.customBoard.findUnique({
      where: { id },
    });

    if (!board) {
      throw new NotFoundError('Board not found');
    }

    // Check ownership
    if (board.userId !== req.userId) {
      throw new AuthorizationError('You do not have permission to modify this board');
    }

    // Build update data
    const updateData: { name?: string; boardData?: any } = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        throw new ValidationError('Board name must be a non-empty string');
      }
      updateData.name = name.trim();
    }

    if (boardData !== undefined) {
      // Validate board data is an array
      if (!Array.isArray(boardData)) {
        throw new ValidationError('Board data must be an array');
      }

      // Convert board data to 8x8 format for validation
      let boardGrid: (PieceType | null)[][];
      
      if (boardData.length === 8 && Array.isArray(boardData[0])) {
        // Already in 8x8 format
        boardGrid = boardData as (PieceType | null)[][];
      } else {
        // Convert from piece array to 8x8 grid
        boardGrid = Array(8)
          .fill(null)
          .map(() => Array(8).fill(null));
        
        for (const piece of boardData) {
          if (piece && piece.row !== undefined && piece.col !== undefined && piece.type) {
            if (piece.row >= 0 && piece.row < 8 && piece.col >= 0 && piece.col < 8) {
              boardGrid[piece.row][piece.col] = piece.type as PieceType;
            }
          }
        }
      }

      // Validate board configuration
      const validation = validateCustomBoard(boardGrid);
      if (!validation.valid) {
        throw new ValidationError(validation.error || 'Invalid board configuration');
      }

      updateData.boardData = boardData;
    }

    // If no fields to update
    if (Object.keys(updateData).length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    // Update board
    const updated = await prisma.customBoard.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        boardData: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/boards/:id
 * Delete a custom board
 */
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthorizationError('User ID not found in token');
    }

    const { id } = req.params;

    // Find board
    const board = await prisma.customBoard.findUnique({
      where: { id },
    });

    if (!board) {
      throw new NotFoundError('Board not found');
    }

    // Check ownership
    if (board.userId !== req.userId) {
      throw new AuthorizationError('You do not have permission to delete this board');
    }

    // Delete board
    await prisma.customBoard.delete({
      where: { id },
    });

    res.json({ message: 'Board deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/boards/validate
 * Validate a board configuration without saving
 */
router.post('/validate', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthorizationError('User ID not found in token');
    }

    const { boardData } = req.body;

    if (!boardData) {
      throw new ValidationError('Board data is required');
    }

    if (!Array.isArray(boardData)) {
      throw new ValidationError('Board data must be an array');
    }

    // Convert board data to 8x8 format for validation
    let boardGrid: (PieceType | null)[][];
    
    if (boardData.length === 8 && Array.isArray(boardData[0])) {
      // Already in 8x8 format
      boardGrid = boardData as (PieceType | null)[][];
    } else {
      // Convert from piece array to 8x8 grid
      boardGrid = Array(8)
        .fill(null)
        .map(() => Array(8).fill(null));
      
      for (const piece of boardData) {
        if (piece && piece.row !== undefined && piece.col !== undefined && piece.type) {
          if (piece.row >= 0 && piece.row < 8 && piece.col >= 0 && piece.col < 8) {
            boardGrid[piece.row][piece.col] = piece.type as PieceType;
          }
        }
      }
    }

    // Validate board configuration
    const validation = validateCustomBoard(boardGrid);

    res.json({
      valid: validation.valid,
      error: validation.error,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

