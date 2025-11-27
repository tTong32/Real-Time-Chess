import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { ValidationError, NotFoundError, AuthorizationError } from '../utils/errors';
import prisma from '../config/database';
import { FriendshipStatus } from '@prisma/client';

const router = express.Router();

/**
 * POST /api/friends/send
 * Send a friend request to another user
 */
router.post('/send', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthorizationError('User ID not found in token');
    }

    const { userId } = req.body;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Can't send request to self
    if (userId === req.userId) {
      throw new ValidationError('Cannot send friend request to yourself');
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw new NotFoundError('User not found');
    }

    // Check if friendship already exists (in either direction)
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: req.userId, receiverId: userId },
          { senderId: userId, receiverId: req.userId },
        ],
      },
    });

    if (existingFriendship) {
      throw new ValidationError('Friendship request already exists');
    }

    // Create friendship request
    const friendship = await prisma.friendship.create({
      data: {
        senderId: req.userId,
        receiverId: userId,
        status: FriendshipStatus.PENDING,
      },
      include: {
        sender: {
          select: {
            id: true,
            elo: true,
            createdAt: true,
          },
        },
        receiver: {
          select: {
            id: true,
            elo: true,
            createdAt: true,
          },
        },
      },
    });

    res.status(201).json({
      id: friendship.id,
      senderId: friendship.senderId,
      receiverId: friendship.receiverId,
      status: friendship.status,
      createdAt: friendship.createdAt,
      sender: friendship.sender,
      receiver: friendship.receiver,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/friends/accept
 * Accept a pending friend request
 */
router.post('/accept', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthorizationError('User ID not found in token');
    }

    const { friendshipId } = req.body;

    if (!friendshipId) {
      throw new ValidationError('Friendship ID is required');
    }

    // Find the friendship
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundError('Friend request not found');
    }

    // Check if user is the receiver
    if (friendship.receiverId !== req.userId) {
      throw new AuthorizationError('You are not authorized to accept this request');
    }

    // Check if already accepted
    if (friendship.status === FriendshipStatus.ACCEPTED) {
      throw new ValidationError('Friend request has already been accepted');
    }

    // Update status to accepted
    const updated = await prisma.friendship.update({
      where: { id: friendshipId },
      data: {
        status: FriendshipStatus.ACCEPTED,
      },
      include: {
        sender: {
          select: {
            id: true,
            elo: true,
            createdAt: true,
          },
        },
        receiver: {
          select: {
            id: true,
            elo: true,
            createdAt: true,
          },
        },
      },
    });

    res.json({
      id: updated.id,
      senderId: updated.senderId,
      receiverId: updated.receiverId,
      status: updated.status,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      sender: updated.sender,
      receiver: updated.receiver,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/friends/reject
 * Reject a pending friend request (deletes the friendship)
 */
router.post('/reject', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthorizationError('User ID not found in token');
    }

    const { friendshipId } = req.body;

    if (!friendshipId) {
      throw new ValidationError('Friendship ID is required');
    }

    // Find the friendship
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundError('Friend request not found');
    }

    // Check if user is the receiver
    if (friendship.receiverId !== req.userId) {
      throw new AuthorizationError('You are not authorized to reject this request');
    }

    // Delete the friendship
    await prisma.friendship.delete({
      where: { id: friendshipId },
    });

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/friends/remove
 * Remove an accepted friendship (deletes the friendship)
 */
router.post('/remove', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthorizationError('User ID not found in token');
    }

    const { userId } = req.body;

    if (!userId) {
      throw new ValidationError('User ID is required');
    }

    // Find the friendship (in either direction)
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId: req.userId, receiverId: userId },
          { senderId: userId, receiverId: req.userId },
        ],
        status: FriendshipStatus.ACCEPTED,
      },
    });

    if (!friendship) {
      throw new NotFoundError('Friendship not found');
    }

    // Delete the friendship
    await prisma.friendship.delete({
      where: { id: friendship.id },
    });

    res.json({ message: 'Friendship removed' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/friends
 * Get list of accepted friends
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthorizationError('User ID not found in token');
    }

    // Get all accepted friendships where user is either sender or receiver
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { senderId: req.userId, status: FriendshipStatus.ACCEPTED },
          { receiverId: req.userId, status: FriendshipStatus.ACCEPTED },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            elo: true,
            createdAt: true,
          },
        },
        receiver: {
          select: {
            id: true,
            elo: true,
            createdAt: true,
          },
        },
      },
    });

    // Map to friend objects (the other user in each friendship)
    const friends = friendships.map((friendship) => {
      const friend = friendship.senderId === req.userId 
        ? friendship.receiver 
        : friendship.sender;
      
      return {
        ...friend,
        friendshipId: friendship.id,
        friendshipCreatedAt: friendship.createdAt,
      };
    });

    res.json({ friends });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/friends/pending
 * Get list of pending friend requests received by the user
 */
router.get('/pending', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthorizationError('User ID not found in token');
    }

    // Get all pending friendships where user is the receiver
    const friendships = await prisma.friendship.findMany({
      where: {
        receiverId: req.userId,
        status: FriendshipStatus.PENDING,
      },
      include: {
        sender: {
          select: {
            id: true,
            elo: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const pendingRequests = friendships.map((friendship) => ({
      id: friendship.id,
      sender: friendship.sender,
      createdAt: friendship.createdAt,
    }));

    res.json({ pendingRequests });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/friends/search
 * Search for users by email (excluding self and existing friends)
 */
router.get('/search', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthorizationError('User ID not found in token');
    }

    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      throw new ValidationError('Email query parameter is required');
    }

    // Get all friend user IDs (accepted friendships)
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { senderId: req.userId, status: FriendshipStatus.ACCEPTED },
          { receiverId: req.userId, status: FriendshipStatus.ACCEPTED },
        ],
      },
      select: {
        senderId: true,
        receiverId: true,
      },
    });

    const friendIds = new Set(
      friendships.flatMap((f) => 
        f.senderId === req.userId ? [f.receiverId] : [f.senderId]
      )
    );
    friendIds.add(req.userId); // Also exclude self

    // Search for users by email (case-insensitive partial match)
    // For PostgreSQL, we need to use a raw query or convert both to lowercase
    // Since emails are stored in lowercase, we can use contains with lowercase
    const searchEmail = email.toLowerCase();
    const users = await prisma.user.findMany({
      where: {
        email: {
          contains: searchEmail,
        },
        id: {
          notIn: Array.from(friendIds),
        },
        emailVerified: true, // Only show verified users
      },
      select: {
        id: true,
        elo: true,
        createdAt: true,
        // Don't expose email for privacy
      },
      take: 10, // Limit results
      orderBy: {
        elo: 'desc', // Order by ELO
      },
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

export default router;

