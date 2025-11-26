import { Request, Response, NextFunction } from 'express';
import { Socket } from 'socket.io';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { AuthenticationError } from '../utils/errors';

// Extend Express Request type to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

/**
 * Authentication middleware for Express routes
 * Verifies JWT token and adds userId to request object
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const payload = verifyToken(token);
      req.userId = payload.userId;
      req.userEmail = payload.email;
      next();
    } catch (error) {
      if (error instanceof Error && error.message === 'Token expired') {
        throw new AuthenticationError('Token expired');
      }
      throw new AuthenticationError('Invalid token');
    }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Authentication middleware for Socket.IO connections
 * Verifies JWT token from handshake auth
 */
export function authenticateSocket(
  socket: Socket,
  next: (err?: Error) => void
): void {
  try {
    const token = socket.handshake.auth?.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const payload = verifyToken(token as string);
      
      // Attach user data to socket
      socket.data.userId = payload.userId;
      socket.data.userEmail = payload.email;
      
      next();
    } catch (error) {
      if (error instanceof Error && error.message === 'Token expired') {
        return next(new Error('Authentication error: Token expired'));
      }
      return next(new Error('Authentication error: Invalid token'));
    }
  } catch (error) {
    return next(new Error('Authentication error: Internal error'));
  }
}

