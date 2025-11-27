import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Socket } from 'socket.io';
import { socketRegistry } from './socketRegistry';

// Mock Socket class
class MockSocket {
  id: string;
  data: any = {};

  constructor(id: string) {
    this.id = id;
  }

  emit = vi.fn();
  on = vi.fn();
  join = vi.fn();
  leave = vi.fn();
}

describe('SocketRegistry', () => {
  beforeEach(() => {
    // Clear registry before each test
    socketRegistry.clear();
  });

  describe('register', () => {
    it('should register a socket with a user ID', () => {
      const socket = new MockSocket('socket-1') as any;
      const userId = 'user-1';

      socketRegistry.register(socket, userId);

      expect(socketRegistry.isUserConnected(userId)).toBe(true);
      expect(socketRegistry.getSocketByUserId(userId)).toBe(socket);
    });

    it('should allow multiple sockets for the same user', () => {
      const socket1 = new MockSocket('socket-1') as any;
      const socket2 = new MockSocket('socket-2') as any;
      const userId = 'user-1';

      socketRegistry.register(socket1, userId);
      socketRegistry.register(socket2, userId);

      expect(socketRegistry.isUserConnected(userId)).toBe(true);
      const sockets = socketRegistry.getSocketsByUserId(userId);
      expect(sockets).toHaveLength(2);
      expect(sockets).toContain(socket1);
      expect(sockets).toContain(socket2);
    });

    it('should map socket ID to user ID', () => {
      const socket = new MockSocket('socket-1') as any;
      const userId = 'user-1';

      socketRegistry.register(socket, userId);

      expect(socketRegistry.getUserIdBySocketId('socket-1')).toBe(userId);
    });
  });

  describe('unregister', () => {
    it('should unregister a socket', () => {
      const socket = new MockSocket('socket-1') as any;
      const userId = 'user-1';

      socketRegistry.register(socket, userId);
      expect(socketRegistry.isUserConnected(userId)).toBe(true);

      socketRegistry.unregister('socket-1');
      expect(socketRegistry.isUserConnected(userId)).toBe(false);
      expect(socketRegistry.getSocketByUserId(userId)).toBeNull();
    });

    it('should handle multiple sockets for one user correctly', () => {
      const socket1 = new MockSocket('socket-1') as any;
      const socket2 = new MockSocket('socket-2') as any;
      const userId = 'user-1';

      socketRegistry.register(socket1, userId);
      socketRegistry.register(socket2, userId);

      socketRegistry.unregister('socket-1');

      expect(socketRegistry.isUserConnected(userId)).toBe(true);
      const sockets = socketRegistry.getSocketsByUserId(userId);
      expect(sockets).toHaveLength(1);
      expect(sockets[0]).toBe(socket2);
    });

    it('should handle unregistering non-existent socket gracefully', () => {
      expect(() => {
        socketRegistry.unregister('non-existent');
      }).not.toThrow();
    });

    it('should remove all mappings when last socket is unregistered', () => {
      const socket = new MockSocket('socket-1') as any;
      const userId = 'user-1';

      socketRegistry.register(socket, userId);
      socketRegistry.unregister('socket-1');

      expect(socketRegistry.getUserIdBySocketId('socket-1')).toBeNull();
      expect(socketRegistry.getSocketByUserId(userId)).toBeNull();
    });
  });

  describe('getSocketsByUserId', () => {
    it('should return empty array if user has no sockets', () => {
      const sockets = socketRegistry.getSocketsByUserId('non-existent-user');
      expect(sockets).toEqual([]);
    });

    it('should return all sockets for a user', () => {
      const socket1 = new MockSocket('socket-1') as any;
      const socket2 = new MockSocket('socket-2') as any;
      const socket3 = new MockSocket('socket-3') as any;
      const userId = 'user-1';

      socketRegistry.register(socket1, userId);
      socketRegistry.register(socket2, userId);
      socketRegistry.register(socket3, userId);

      const sockets = socketRegistry.getSocketsByUserId(userId);
      expect(sockets).toHaveLength(3);
    });

    it('should return only active sockets', () => {
      const socket1 = new MockSocket('socket-1') as any;
      const socket2 = new MockSocket('socket-2') as any;
      const userId = 'user-1';

      socketRegistry.register(socket1, userId);
      socketRegistry.register(socket2, userId);
      socketRegistry.unregister('socket-1');

      const sockets = socketRegistry.getSocketsByUserId(userId);
      expect(sockets).toHaveLength(1);
      expect(sockets[0]).toBe(socket2);
    });
  });

  describe('getSocketByUserId', () => {
    it('should return first socket if user has multiple sockets', () => {
      const socket1 = new MockSocket('socket-1') as any;
      const socket2 = new MockSocket('socket-2') as any;
      const userId = 'user-1';

      socketRegistry.register(socket1, userId);
      socketRegistry.register(socket2, userId);

      const socket = socketRegistry.getSocketByUserId(userId);
      expect(socket).toBe(socket1);
    });

    it('should return null if user has no sockets', () => {
      const socket = socketRegistry.getSocketByUserId('non-existent-user');
      expect(socket).toBeNull();
    });
  });

  describe('isUserConnected', () => {
    it('should return true if user has connected sockets', () => {
      const socket = new MockSocket('socket-1') as any;
      const userId = 'user-1';

      socketRegistry.register(socket, userId);
      expect(socketRegistry.isUserConnected(userId)).toBe(true);
    });

    it('should return false if user has no connected sockets', () => {
      expect(socketRegistry.isUserConnected('non-existent-user')).toBe(false);
    });

    it('should return false after all sockets are unregistered', () => {
      const socket = new MockSocket('socket-1') as any;
      const userId = 'user-1';

      socketRegistry.register(socket, userId);
      socketRegistry.unregister('socket-1');

      expect(socketRegistry.isUserConnected(userId)).toBe(false);
    });
  });

  describe('getUserIdBySocketId', () => {
    it('should return user ID for registered socket', () => {
      const socket = new MockSocket('socket-1') as any;
      const userId = 'user-1';

      socketRegistry.register(socket, userId);
      expect(socketRegistry.getUserIdBySocketId('socket-1')).toBe(userId);
    });

    it('should return null for non-existent socket', () => {
      expect(socketRegistry.getUserIdBySocketId('non-existent')).toBeNull();
    });
  });

  describe('getAllUserIds', () => {
    it('should return empty array when no users are connected', () => {
      const userIds = socketRegistry.getAllUserIds();
      expect(userIds).toEqual([]);
    });

    it('should return all connected user IDs', () => {
      const socket1 = new MockSocket('socket-1') as any;
      const socket2 = new MockSocket('socket-2') as any;
      const socket3 = new MockSocket('socket-3') as any;

      socketRegistry.register(socket1, 'user-1');
      socketRegistry.register(socket2, 'user-2');
      socketRegistry.register(socket3, 'user-1'); // Same user, multiple sockets

      const userIds = socketRegistry.getAllUserIds();
      expect(userIds).toHaveLength(2);
      expect(userIds).toContain('user-1');
      expect(userIds).toContain('user-2');
    });

    it('should not include users after all their sockets are unregistered', () => {
      const socket = new MockSocket('socket-1') as any;

      socketRegistry.register(socket, 'user-1');
      socketRegistry.unregister('socket-1');

      const userIds = socketRegistry.getAllUserIds();
      expect(userIds).not.toContain('user-1');
    });
  });

  describe('getTotalSockets', () => {
    it('should return 0 when no sockets are registered', () => {
      expect(socketRegistry.getTotalSockets()).toBe(0);
    });

    it('should return correct count of registered sockets', () => {
      const socket1 = new MockSocket('socket-1') as any;
      const socket2 = new MockSocket('socket-2') as any;
      const socket3 = new MockSocket('socket-3') as any;

      socketRegistry.register(socket1, 'user-1');
      socketRegistry.register(socket2, 'user-1');
      socketRegistry.register(socket3, 'user-2');

      expect(socketRegistry.getTotalSockets()).toBe(3);
    });

    it('should decrease count when sockets are unregistered', () => {
      const socket1 = new MockSocket('socket-1') as any;
      const socket2 = new MockSocket('socket-2') as any;

      socketRegistry.register(socket1, 'user-1');
      socketRegistry.register(socket2, 'user-2');
      expect(socketRegistry.getTotalSockets()).toBe(2);

      socketRegistry.unregister('socket-1');
      expect(socketRegistry.getTotalSockets()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all registrations', () => {
      const socket1 = new MockSocket('socket-1') as any;
      const socket2 = new MockSocket('socket-2') as any;

      socketRegistry.register(socket1, 'user-1');
      socketRegistry.register(socket2, 'user-2');

      socketRegistry.clear();

      expect(socketRegistry.getTotalSockets()).toBe(0);
      expect(socketRegistry.getAllUserIds()).toHaveLength(0);
      expect(socketRegistry.isUserConnected('user-1')).toBe(false);
      expect(socketRegistry.isUserConnected('user-2')).toBe(false);
    });
  });
});

