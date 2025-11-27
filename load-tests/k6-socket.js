import ws from 'k6/ws';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 concurrent connections
    { duration: '1m', target: 10 },   // Stay at 10
    { duration: '30s', target: 30 },   // Ramp up to 30
    { duration: '1m', target: 30 },   // Stay at 30
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'ws://localhost:3000';

export default function () {
  const response = ws.connect(`${BASE_URL}`, {
    headers: {
      Authorization: 'Bearer test-token', // In real tests, get actual token
    },
  }, function (socket) {
    socket.on('open', () => {
      // Test joinRoom
      socket.send(JSON.stringify({
        type: 'joinRoom',
        data: { roomCode: 'TEST01' },
      }));
    });

    socket.on('message', (data) => {
      const message = JSON.parse(data);
      
      check(message, {
        'received valid message': (m) => m !== null,
      }) || errorRate.add(1);

      // Test makeMove
      if (message.type === 'roomJoined' || message.type === 'gameStateUpdate') {
        socket.send(JSON.stringify({
          type: 'makeMove',
          data: {
            gameId: message.gameId || 'test-game',
            fromRow: 6,
            fromCol: 4,
            toRow: 4,
            toCol: 4,
          },
        }));
      }
    });

    socket.on('close', () => {
      // Connection closed
    });

    socket.on('error', (e) => {
      errorRate.add(1);
    });

    // Close connection after 10 seconds
    setTimeout(() => {
      socket.close();
    }, 10000);
  });

  check(response, {
    'socket connection successful': (r) => r && r.status === 101,
  }) || errorRate.add(1);
}

