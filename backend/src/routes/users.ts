import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { ValidationError, NotFoundError, AuthorizationError } from '../utils/errors';
import prisma from '../config/database';

const router = express.Router();

/**
 * GET /api/users/me
 * Get current user profile
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthorizationError('User ID not found in token');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        elo: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/users/me
 * Update current user profile
 */
router.patch('/me', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthorizationError('User ID not found in token');
    }

    const { email } = req.body;

    // Build update data (only allow email for now)
    const updateData: { email?: string } = {};

    if (email !== undefined) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new ValidationError('Invalid email format');
      }

      // Check if email is already taken
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser && existingUser.id !== req.userId) {
        throw new ValidationError('Email already registered');
      }

      updateData.email = email.toLowerCase();
    }

    // If no fields to update
    if (Object.keys(updateData).length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        elo: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/me/stats
 * Get current user statistics
 */
router.get('/me/stats', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthorizationError('User ID not found in token');
    }

    // Get user's games
    const games = await prisma.game.findMany({
      where: {
        OR: [
          { whiteId: req.userId },
          { blackId: req.userId },
        ],
        status: 'FINISHED',
      },
      select: {
        id: true,
        winnerId: true,
        whiteId: true,
        blackId: true,
        isRated: true,
        createdAt: true,
        endedAt: true,
      },
    });

    // Calculate statistics
    const totalGames = games.length;
    const wins = games.filter((game) => game.winnerId === req.userId).length;
    const losses = totalGames - wins;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

    const ratedGames = games.filter((game) => game.isRated);
    const ratedWins = ratedGames.filter((game) => game.winnerId === req.userId).length;

    // Get user's current ELO
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { elo: true },
    });

    // Get total moves made
    const totalMoves = await prisma.move.count({
      where: { playerId: req.userId },
    });

    // Get recent games (last 10)
    const recentGames = await prisma.game.findMany({
      where: {
        OR: [
          { whiteId: req.userId },
          { blackId: req.userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        winnerId: true,
        whiteId: true,
        blackId: true,
        isRated: true,
        createdAt: true,
        endedAt: true,
      },
    });

    res.json({
      elo: user?.elo || 1000,
      totalGames,
      wins,
      losses,
      winRate: Math.round(winRate * 100) / 100, // Round to 2 decimal places
      ratedGames: ratedGames.length,
      ratedWins,
      totalMoves,
      recentGames,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:id
 * Get user profile by ID (public info only)
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: false, // Don't expose email for privacy
        elo: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get basic stats
    const totalGames = await prisma.game.count({
      where: {
        OR: [
          { whiteId: id },
          { blackId: id },
        ],
        status: 'FINISHED',
      },
    });

    const wins = await prisma.game.count({
      where: {
        winnerId: id,
        status: 'FINISHED',
      },
    });

    res.json({
      ...user,
      stats: {
        totalGames,
        wins,
        losses: totalGames - wins,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

