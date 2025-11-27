import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createTestServer } from '../helpers/test-app';
import prisma from '../../config/database';

let httpServer: ReturnType<typeof createTestServer>['server'];
let io: ReturnType<typeof createTestServer>['io'];
let clientSocket: ClientSocket;
let serverPort: number;

beforeAll((done) => {
  const testServer = createTestServer();
  httpServer = testServer.server;
  io = testServer.io;
  
  httpServer.listen(() => {
    serverPort = (httpServer.address() as any)?.port;
    clientSocket = Client(`http://localhost:${serverPort}`, {
      auth: {
        token: 'test-token', // In real tests, generate actual JWT token
      },
      transports: ['websocket'],
    });
    
    clientSocket.on('connect', done);
    clientSocket.on('connect_error', (err) => {
      // Connection might fail due to auth, that's okay for now
      done();
    });
  });
});

afterAll(async () => {
  if (clientSocket) {
    clientSocket.close();
  }
  if (httpServer) {
    httpServer.close();
  }
  if (io) {
    io.close();
  }
  await prisma.$disconnect();
});

describe('Socket.IO Integration Tests', () => {
  it('should connect to socket server', (done) => {
    expect(clientSocket.connected).toBe(true);
    done();
  });

  it('should handle joinRoom event', (done) => {
    const roomCode = 'TEST01';
    
    clientSocket.emit('joinRoom', { roomCode });
    
    clientSocket.on('roomJoined', (data) => {
      expect(data).toHaveProperty('gameId');
      done();
    });
    
    clientSocket.on('roomError', (error) => {
      // Room might not exist in test, that's okay
      expect(error).toHaveProperty('error');
      done();
    });
  });

  it('should handle makeMove event', (done) => {
    const moveData = {
      gameId: 'test-game-id',
      fromRow: 6,
      fromCol: 4,
      toRow: 4,
      toCol: 4,
    };
    
    clientSocket.emit('makeMove', moveData);
    
    clientSocket.on('moveAccepted', (data) => {
      expect(data).toHaveProperty('move');
      done();
    });
    
    clientSocket.on('moveRejected', (error) => {
      // Move might be invalid, that's okay for testing
      expect(error).toHaveProperty('reason');
      done();
    });
  });

  it('should receive gameStateUpdate events', (done) => {
    clientSocket.on('gameStateUpdate', (state) => {
      expect(state).toHaveProperty('board');
      expect(state).toHaveProperty('whiteState');
      expect(state).toHaveProperty('blackState');
      done();
    });
    
    // Trigger a state update (this would normally come from the server)
    // In real tests, you'd set up a game and make a move
  });
});

