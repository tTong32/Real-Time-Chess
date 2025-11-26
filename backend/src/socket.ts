import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { authenticateSocket } from './middleware/auth';
import { gameManager } from './managers/GameManager';
import { roomManager } from './managers/RoomManager';
import { matchmakingManager } from './managers/MatchmakingManager';
import { config } from './config/environment';
import prisma from './config/database';
import { GameStatus } from '@prisma/client';

/**
 * Setup Socket.IO server with event handlers
 * @param server - HTTP server instance
 * @returns Socket.IO server instance
 */
export function setupSocket(server: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(server, {
    cors: {
      origin: config.corsOrigin,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware - all connections must be authenticated
  io.use(authenticateSocket);

  // Register callback for match found notifications (from background matching loop)
  matchmakingManager.onMatchFound(async (player1Id: string, player2Id: string, gameId: string) => {
    // Start the game
    try {
      await gameManager.startGame(gameId);
      
      // Get initial game state
      const state = gameManager.getGameState(gameId);
      
      // Notify both players of the match
      io.sockets.sockets.forEach((sock) => {
        if (sock.data.userId === player1Id || sock.data.userId === player2Id) {
          sock.emit('matchFound', { gameId });
          sock.join(`game:${gameId}`);
          
          if (state) {
            sock.emit('gameStarted', {
              gameId,
              state,
            });
          }
        }
      });
    } catch (error) {
      console.error('Error starting matched game:', error);
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    const userEmail = socket.data.userEmail;

    console.log(`Socket connected: ${userId} (${userEmail})`);

    // Join a room by room code (for friend games)
    socket.on('joinRoom', async (data: { roomCode: string }) => {
      try {
        if (!data.roomCode) {
          socket.emit('roomError', { error: 'Room code is required' });
          return;
        }

        const result = await roomManager.joinRoom(data.roomCode, userId);

        if (result.success && result.gameId) {
          // Join the game room for real-time updates
          socket.join(`game:${result.gameId}`);
          
          // Notify the player
          socket.emit('roomJoined', {
            gameId: result.gameId,
            roomCode: data.roomCode,
          });

          // Load and send current game state if game is active
          const game = await prisma.game.findUnique({
            where: { id: result.gameId },
          });

          if (game && game.status === GameStatus.ACTIVE) {
            const state = gameManager.getGameState(result.gameId);
            if (state) {
              socket.emit('gameStateUpdate', state);
            }
          } else if (game && game.status === GameStatus.WAITING) {
            // Notify other player that someone joined
            socket.to(`game:${result.gameId}`).emit('playerJoined', {
              gameId: result.gameId,
              userId,
            });

            // Send waiting status
            socket.emit('gameWaiting', { gameId: result.gameId });
          }
        } else {
          socket.emit('roomError', {
            error: result.error || 'Failed to join room',
          });
        }
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('roomError', {
          error: 'Internal server error',
        });
      }
    });

    // Create a new room (host a friend game)
    socket.on('createRoom', async () => {
      try {
        const roomCode = await roomManager.createRoom(userId);
        
        socket.emit('roomCreated', {
          roomCode,
        });
      } catch (error) {
        console.error('Error creating room:', error);
        socket.emit('roomError', {
          error: 'Failed to create room',
        });
      }
    });

    // Start a game (transition from WAITING to ACTIVE)
    socket.on('startGame', async (data: { gameId: string }) => {
      try {
        const game = await prisma.game.findUnique({
          where: { id: data.gameId },
        });

        if (!game) {
          socket.emit('gameError', { error: 'Game not found' });
          return;
        }

        // Verify user is part of the game
        if (game.whiteId !== userId && game.blackId !== userId) {
          socket.emit('gameError', { error: 'Unauthorized' });
          return;
        }

        // Start the game
        if (game.status === GameStatus.WAITING) {
          await gameManager.startGame(data.gameId);

          // Join game room for both players
          io.sockets.sockets.forEach((sock) => {
            if (
              sock.data.userId === game.whiteId ||
              sock.data.userId === game.blackId
            ) {
              sock.join(`game:${data.gameId}`);
            }
          });

          // Send initial game state to all players
          const state = gameManager.getGameState(data.gameId);
          if (state) {
            io.to(`game:${data.gameId}`).emit('gameStarted', {
              gameId: data.gameId,
              state,
            });
          }
        } else {
          socket.emit('gameError', {
            error: `Cannot start game with status ${game.status}`,
          });
        }
      } catch (error) {
        console.error('Error starting game:', error);
        socket.emit('gameError', { error: 'Failed to start game' });
      }
    });

    // Make a move in the game
    socket.on('makeMove', async (data: {
      gameId: string;
      fromRow: number;
      fromCol: number;
      toRow: number;
      toCol: number;
    }) => {
      try {
        // Validate input
        if (
          typeof data.fromRow !== 'number' ||
          typeof data.fromCol !== 'number' ||
          typeof data.toRow !== 'number' ||
          typeof data.toCol !== 'number' ||
          data.fromRow < 0 ||
          data.fromRow > 7 ||
          data.fromCol < 0 ||
          data.fromCol > 7 ||
          data.toRow < 0 ||
          data.toRow > 7 ||
          data.toCol < 0 ||
          data.toCol > 7
        ) {
          socket.emit('moveRejected', {
            reason: 'Invalid move coordinates',
          });
          return;
        }

        // Attempt the move
        const result = await gameManager.attemptMove(data.gameId, {
          fromRow: data.fromRow,
          fromCol: data.fromCol,
          toRow: data.toRow,
          toCol: data.toCol,
          playerId: userId,
          timestamp: Date.now(),
        });

        if (result.success) {
          // Get updated game state
          const state = gameManager.getGameState(data.gameId);

          if (state) {
            // Broadcast to all players in the game room
            io.to(`game:${data.gameId}`).emit('gameStateUpdate', state);

            // Send confirmation to the player who made the move
            socket.emit('moveAccepted', {
              move: {
                fromRow: data.fromRow,
                fromCol: data.fromCol,
                toRow: data.toRow,
                toCol: data.toCol,
              },
            });

            // Check if game ended
            if (state.status === 'finished') {
              io.to(`game:${data.gameId}`).emit('gameEnded', {
                gameId: data.gameId,
                winner: state.winner,
                state,
              });
            }
          }
        } else {
          socket.emit('moveRejected', {
            reason: result.reason || 'Move rejected',
          });
        }
      } catch (error) {
        console.error('Error making move:', error);
        socket.emit('moveRejected', {
          reason: 'Internal server error',
        });
      }
    });

    // Request matchmaking (join the queue)
    socket.on('requestMatchmaking', async () => {
      try {
        const result = await matchmakingManager.addToQueue(userId, socket.id);

        if (result.success) {
          if (result.matched && result.gameId) {
            // Immediate match found!
            socket.emit('matchFound', {
              gameId: result.gameId,
            });

            // Join game room
            socket.join(`game:${result.gameId}`);

            // Start the game
            await gameManager.startGame(result.gameId);

            // Send initial game state
            const state = gameManager.getGameState(result.gameId);
            if (state) {
              socket.emit('gameStarted', {
                gameId: result.gameId,
                state,
              });
            }

            // Notify the other player (if they're connected)
            const game = await prisma.game.findUnique({
              where: { id: result.gameId },
            });

            if (game) {
              const opponentId =
                game.whiteId === userId ? game.blackId : game.whiteId;
              
              // Find opponent's socket and notify them
              io.sockets.sockets.forEach((sock) => {
                if (sock.data.userId === opponentId && sock.id !== socket.id) {
                  sock.emit('matchFound', { 
                    gameId: result.gameId,
                  });
                  sock.join(`game:${result.gameId}`);
                  
                  if (state) {
                    sock.emit('gameStarted', {
                      gameId: result.gameId,
                      state,
                    });
                  }
                }
              });

              // Also update matchmaking status for opponent if they're in queue
              const opponentSocketId = matchmakingManager.getQueueInfo(opponentId)?.socketId;
              if (opponentSocketId) {
                // Opponent is connected but not yet notified - they'll be notified by their socket's matchmaking handler
                // Remove them from queue (already done by findMatch, but just in case)
                matchmakingManager.removeFromQueue(opponentId);
              }
            }
          } else {
            // Added to queue, waiting for match
            socket.emit('matchmakingStarted', {
              queueSize: matchmakingManager.getQueueSize(),
            });
          }
        } else {
          socket.emit('matchmakingError', {
            error: result.error || 'Failed to join matchmaking queue',
          });
        }
      } catch (error) {
        console.error('Error requesting matchmaking:', error);
        socket.emit('matchmakingError', {
          error: 'Failed to start matchmaking',
        });
      }
    });

    // Cancel matchmaking (leave the queue)
    socket.on('cancelMatchmaking', async () => {
      try {
        const result = matchmakingManager.removeFromQueue(userId);
        if (result.success) {
          socket.emit('matchmakingCancelled');
        }
      } catch (error) {
        console.error('Error cancelling matchmaking:', error);
      }
    });

    // Get current matchmaking status
    socket.on('getMatchmakingStatus', () => {
      const isInQueue = matchmakingManager.isInQueue(userId);
      const queueInfo = matchmakingManager.getQueueInfo(userId);
      
      socket.emit('matchmakingStatus', {
        inQueue: isInQueue,
        queueInfo: queueInfo
          ? {
              joinedAt: queueInfo.joinedAt,
              timeInQueue: Date.now() - queueInfo.joinedAt,
            }
          : null,
        queueSize: matchmakingManager.getQueueSize(),
      });
    });

    // Spectate an active game
    socket.on('spectateGame', async (data: { gameId: string }) => {
      try {
        const game = await prisma.game.findUnique({
          where: { id: data.gameId },
        });

        if (!game) {
          socket.emit('spectateError', { error: 'Game not found' });
          return;
        }

        if (game.status !== GameStatus.ACTIVE) {
          socket.emit('spectateError', {
            error: 'Game is not active',
          });
          return;
        }

        // Join spectator room
        socket.join(`spectate:${data.gameId}`);

        // Send current game state
        const state = gameManager.getGameState(data.gameId);
        if (state) {
          socket.emit('gameStateUpdate', state);
        }

        socket.emit('spectatingStarted', {
          gameId: data.gameId,
        });
      } catch (error) {
        console.error('Error spectating game:', error);
        socket.emit('spectateError', {
          error: 'Failed to spectate game',
        });
      }
    });

    // Leave a game room
    socket.on('leaveGame', async (data: { gameId: string }) => {
      socket.leave(`game:${data.gameId}`);
      socket.leave(`spectate:${data.gameId}`);
      socket.emit('gameLeft', { gameId: data.gameId });
    });

    // Request game state update
    socket.on('requestGameState', async (data: { gameId: string }) => {
      try {
        const state = gameManager.getGameState(data.gameId);
        if (state) {
          socket.emit('gameStateUpdate', state);
        } else {
          // Try loading from database
          const dbState = await gameManager.loadGameStateFromDb(data.gameId);
          if (dbState) {
            socket.emit('gameStateUpdate', dbState);
          } else {
            socket.emit('gameError', {
              error: 'Game not found',
            });
          }
        }
      } catch (error) {
        console.error('Error getting game state:', error);
        socket.emit('gameError', {
          error: 'Failed to get game state',
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      console.log(`Socket disconnected: ${userId} (reason: ${reason})`);

      // Remove from matchmaking queue
      matchmakingManager.removeFromQueue(userId);

      // Leave all game rooms
      const rooms = Array.from(socket.rooms);
      for (const room of rooms) {
        if (room.startsWith('game:') || room.startsWith('spectate:')) {
          socket.leave(room);
        }
      }
    });

    // Handle reconnection
    socket.on('reconnect', async () => {
      console.log(`Socket reconnected: ${userId}`);

      // Check if user was in matchmaking queue and restore
      const wasInQueue = matchmakingManager.isInQueue(userId);
      if (wasInQueue) {
        socket.emit('matchmakingStatus', {
          inQueue: true,
          queueInfo: matchmakingManager.getQueueInfo(userId),
        });
      }
    });
  });

  return io;
}

