import jwt from 'jsonwebtoken';
import { config } from '../config/environment';

export interface JwtPayload {
  userId: string;
  email: string;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: JwtPayload): string {
  const secret = config.jwtSecret;
  if (!secret || secret === '') {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(payload, secret, {
    expiresIn: config.jwtExpiresIn || '7d',
  } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload {
  const secret = config.jwtSecret;
  if (!secret || secret === '') {
    throw new Error('JWT_SECRET is not configured');
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    throw error;
  }
}

