import express from 'express';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { generateToken } from '../utils/jwt';
import { sendVerificationEmail } from '../utils/email';
import { authenticateToken } from '../middleware/auth';
import { ValidationError, AuthenticationError, NotFoundError } from '../utils/errors';
import prisma from '../config/database';

const router = express.Router();

/**
 * POST /api/auth/signup
 * Create a new user account
 */
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password strength (minimum 6 characters)
    if (password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters long');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new ValidationError('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Generate verification token
    const verificationToken = randomUUID();

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        verificationToken,
        emailVerified: false,
        elo: 1000, // Default starting ELO
      },
    });

    // Send verification email (non-blocking)
    sendVerificationEmail(user.email, verificationToken).catch((error) => {
      console.error('Failed to send verification email:', error);
      // Don't fail the request if email fails
    });

    res.status(201).json({
      message: 'User created successfully. Please check your email to verify your account.',
      userId: user.id,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if email exists for security
      throw new AuthenticationError('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new AuthenticationError('Please verify your email before logging in');
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Return user data (without sensitive info)
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        elo: user.elo,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/verify/:token
 * Verify user email with verification token
 */
router.get('/verify/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      throw new ValidationError('Verification token is required');
    }

    // Find user by verification token
    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new NotFoundError('Invalid or expired verification token');
    }

    // Update user to verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null, // Clear token after verification
      },
    });

    res.json({
      message: 'Email verified successfully. You can now log in.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AuthenticationError('User ID not found in token');
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

export default router;

