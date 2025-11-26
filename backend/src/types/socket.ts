import { Socket } from 'socket.io';

/**
 * Extend Socket.IO Socket type to include user authentication data
 */
export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
    userEmail: string;
  };
}

