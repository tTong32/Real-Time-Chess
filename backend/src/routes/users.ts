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
 * Optimized: Uses a single query with efficient counting and filtering
 */
router.get('/me/stats', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthorizationError('User ID not found in token');
    }

    // Execute all queries in parallel for better performance
    const [finishedGames, user, totalMoves, recentGames] = await Promise.all([
      // Get finished games with minimal fields needed for stats calculation
      prisma.game.findMany({
        where: {
          OR: [
            { whiteId: req.userId },
            { blackId: req.userId },
          ],
          status: 'FINISHED',
        },
        select: {
          winnerId: true,
          isRated: true,
        },
      }),
      // Get user's current ELO
      prisma.user.findUnique({
        where: { id: req.userId },
        select: { elo: true },
      }),
      // Get total moves count
      prisma.move.count({
        where: { playerId: req.userId },
      }),
      // Get recent games (last 10) - separate query as it needs different ordering
      prisma.game.findMany({
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
      }),
    ]);

    // Calculate statistics from the finished games
    const totalGames = finishedGames.length;
    const wins = finishedGames.filter((game) => game.winnerId === req.userId).length;
    const losses = totalGames - wins;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

    const ratedGames = finishedGames.filter((game) => game.isRated);
    const ratedWins = ratedGames.filter((game) => game.winnerId === req.userId).length;

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
 * Optimized: Uses parallel queries for user and stats
 */
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Execute queries in parallel
    const [user, totalGames, wins] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: false, // Don't expose email for privacy
          elo: true,
          createdAt: true,
        },
      }),
      prisma.game.count({
        where: {
          OR: [
            { whiteId: id },
            { blackId: id },
          ],
          status: 'FINISHED',
        },
      }),
      prisma.game.count({
        where: {
          winnerId: id,
          status: 'FINISHED',
        },
      }),
    ]);

    if (!user) {
      throw new NotFoundError('User not found');
    }

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
