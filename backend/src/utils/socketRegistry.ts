import { Socket } from 'socket.io';

/**
 * Socket Registry - Maps user IDs to their socket instances for fast lookups
 * This optimizes Socket.IO performance by avoiding iteration through all sockets
 */
class SocketRegistry {
  private userIdToSocket: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private socketIdToUserId: Map<string, string> = new Map(); // socketId -> userId
  private socketIdToSocket: Map<string, Socket> = new Map(); // socketId -> Socket instance

  /**
   * Register a socket with a user ID
   */
  register(socket: Socket, userId: string): void {
    const socketId = socket.id;
    
    // Add socket to user's socket set
    if (!this.userIdToSocket.has(userId)) {
      this.userIdToSocket.set(userId, new Set());
    }
    this.userIdToSocket.get(userId)!.add(socketId);
    
    // Store reverse mappings
    this.socketIdToUserId.set(socketId, userId);
    this.socketIdToSocket.set(socketId, socket);
  }

  /**
   * Unregister a socket
   */
  unregister(socketId: string): void {
    const userId = this.socketIdToUserId.get(socketId);
    
    if (userId) {
      // Remove from user's socket set
      const userSockets = this.userIdToSocket.get(userId);
      if (userSockets) {
        userSockets.delete(socketId);
        if (userSockets.size === 0) {
          this.userIdToSocket.delete(userId);
        }
      }
    }
    
    // Remove reverse mappings
    this.socketIdToUserId.delete(socketId);
    this.socketIdToSocket.delete(socketId);
  }

  /**
   * Get all sockets for a user ID
   */
  getSocketsByUserId(userId: string): Socket[] {
    const socketIds = this.userIdToSocket.get(userId);
    if (!socketIds) return [];
    
    const sockets: Socket[] = [];
    for (const socketId of socketIds) {
      const socket = this.socketIdToSocket.get(socketId);
      if (socket) {
        sockets.push(socket);
      }
    }
    return sockets;
  }

  /**
   * Get socket by user ID (returns first socket if multiple exist)
   */
  getSocketByUserId(userId: string): Socket | null {
    const sockets = this.getSocketsByUserId(userId);
    return sockets.length > 0 ? sockets[0] : null;
  }

  /**
   * Check if a user has any connected sockets
   */
  isUserConnected(userId: string): boolean {
    const sockets = this.userIdToSocket.get(userId);
    return sockets ? sockets.size > 0 : false;
  }

  /**
   * Get user ID by socket ID
   */
  getUserIdBySocketId(socketId: string): string | null {
    return this.socketIdToUserId.get(socketId) || null;
  }

  /**
   * Get all connected user IDs
   */
  getAllUserIds(): string[] {
    return Array.from(this.userIdToSocket.keys());
  }

  /**
   * Get total number of connected sockets
   */
  getTotalSockets(): number {
    return this.socketIdToSocket.size;
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.userIdToSocket.clear();
    this.socketIdToUserId.clear();
    this.socketIdToSocket.clear();
  }
}

// Export singleton instance
export const socketRegistry = new SocketRegistry();

