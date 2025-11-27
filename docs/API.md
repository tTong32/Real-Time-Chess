# API Documentation

Complete API reference for Real-Time Chess backend.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## REST API Endpoints

### Authentication (`/api/auth`)

#### POST `/api/auth/signup`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "message": "User created successfully. Please check your email to verify your account.",
  "userId": "uuid"
}
```

**Errors:**
- `400` - Validation error (email format, password length, email already registered)

---

#### POST `/api/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "token": "jwt-token-string",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "elo": 1000,
    "emailVerified": true
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `403` - Email not verified

---

#### GET `/api/auth/verify/:token`

Verify user email address.

**Response (200):**
```json
{
  "message": "Email verified successfully. You can now log in."
}
```

**Errors:**
- `400` - Invalid or expired token

---

#### GET `/api/auth/me`

Get current authenticated user profile.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "elo": 1200,
  "emailVerified": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Errors:**
- `401` - Unauthorized
- `404` - User not found

---

### Users (`/api/users`)

#### GET `/api/users/me`

Get current user profile (same as `/api/auth/me`).

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "elo": 1200,
  "emailVerified": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

#### PATCH `/api/users/me`

Update current user profile.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "email": "newemail@example.com"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "newemail@example.com",
  "elo": 1200,
  "emailVerified": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

#### GET `/api/users/me/stats`

Get current user game statistics.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "elo": 1200,
  "totalGames": 50,
  "wins": 30,
  "losses": 20,
  "winRate": 60.0,
  "ratedGames": 40,
  "ratedWins": 25,
  "totalMoves": 1500,
  "recentGames": [...]
}
```

---

#### GET `/api/users/:id`

Get public user profile by ID.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "id": "uuid",
  "elo": 1200,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "stats": {
    "totalGames": 50,
    "wins": 30,
    "losses": 20
  }
}
```

---

### Custom Boards (`/api/boards`)

#### GET `/api/boards`

Get all custom boards for the authenticated user.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "My Custom Board",
    "boardData": [...],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

#### GET `/api/boards/:id`

Get a specific custom board by ID.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "id": "uuid",
  "name": "My Custom Board",
  "boardData": [...],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Errors:**
- `403` - Not the board owner
- `404` - Board not found

---

#### POST `/api/boards`

Create a new custom board.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "name": "My Custom Board",
  "boardData": [
    {
      "row": 0,
      "col": 0,
      "type": "rook",
      "color": "white"
    }
  ]
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "My Custom Board",
  "boardData": [...],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Errors:**
- `400` - Invalid board configuration

---

#### PUT `/api/boards/:id`

Update an existing custom board.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "name": "Updated Name",
  "boardData": [...]
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Updated Name",
  "boardData": [...],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

#### DELETE `/api/boards/:id`

Delete a custom board.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "message": "Board deleted successfully"
}
```

---

#### POST `/api/boards/validate`

Validate a board configuration without saving.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "boardData": [...]
}
```

**Response (200):**
```json
{
  "valid": true,
  "error": null
}
```

or

```json
{
  "valid": false,
  "error": "Board must have exactly one white king and one black king"
}
```

---

### Friends (`/api/friends`)

#### GET `/api/friends`

Get list of accepted friends.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "friends": [
    {
      "id": "uuid",
      "elo": 1200,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "friendshipId": "uuid",
      "friendshipCreatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### GET `/api/friends/pending`

Get list of pending friend requests received.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response (200):**
```json
{
  "pendingRequests": [
    {
      "id": "uuid",
      "sender": {
        "id": "uuid",
        "elo": 1200,
        "createdAt": "2024-01-01T00:00:00.000Z"
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### GET `/api/friends/search?email=query`

Search for users by email.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Query Parameters:**
- `email` (required) - Email search query

**Response (200):**
```json
{
  "users": [
    {
      "id": "uuid",
      "elo": 1200,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### POST `/api/friends/send`

Send a friend request to another user.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "userId": "uuid"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "senderId": "uuid",
  "receiverId": "uuid",
  "status": "PENDING",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "sender": {...},
  "receiver": {...}
}
```

---

#### POST `/api/friends/accept`

Accept a pending friend request.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "friendshipId": "uuid"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "senderId": "uuid",
  "receiverId": "uuid",
  "status": "ACCEPTED",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "sender": {...},
  "receiver": {...}
}
```

---

#### POST `/api/friends/reject`

Reject a pending friend request.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "friendshipId": "uuid"
}
```

**Response (200):**
```json
{
  "message": "Friend request rejected"
}
```

---

#### POST `/api/friends/remove`

Remove an accepted friendship.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Request Body:**
```json
{
  "userId": "uuid"
}
```

**Response (200):**
```json
{
  "message": "Friendship removed"
}
```

---

## Socket.IO Events

### Connection

All Socket.IO connections require authentication. Include the JWT token when connecting:

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Client → Server Events

#### `joinRoom`

Join a game room by room code.

**Payload:**
```json
{
  "roomCode": "ABC123"
}
```

**Server Response:**
- `roomJoined` - Successfully joined room
- `roomError` - Failed to join room

---

#### `createRoom`

Create a new game room (for friend games).

**Server Response:**
- `roomCreated` - Room created with room code
- `roomError` - Failed to create room

---

#### `startGame`

Start a game (transition from WAITING to ACTIVE).

**Payload:**
```json
{
  "gameId": "uuid"
}
```

**Server Response:**
- `gameStarted` - Game started successfully
- `gameError` - Failed to start game

---

#### `makeMove`

Make a move in the game.

**Payload:**
```json
{
  "gameId": "uuid",
  "fromRow": 6,
  "fromCol": 4,
  "toRow": 4,
  "toCol": 4
}
```

**Server Response:**
- `moveAccepted` - Move was successful
- `moveRejected` - Move was rejected (with reason)
- `gameStateUpdate` - Updated game state (broadcast to all players)
- `gameEnded` - Game finished (if king was captured)

---

#### `requestMatchmaking`

Join the matchmaking queue.

**Server Response:**
- `matchFound` - Match found immediately
- `matchmakingStarted` - Added to queue, waiting for match
- `matchmakingError` - Failed to join queue

---

#### `cancelMatchmaking`

Leave the matchmaking queue.

**Server Response:**
- `matchmakingCancelled` - Successfully left queue

---

#### `getMatchmakingStatus`

Get current matchmaking status.

**Server Response:**
- `matchmakingStatus` - Current queue status

---

#### `spectateGame`

Spectate an active game.

**Payload:**
```json
{
  "gameId": "uuid"
}
```

**Server Response:**
- `spectatingStarted` - Successfully spectating
- `spectateError` - Failed to spectate
- `gameStateUpdate` - Current game state

---

#### `leaveGame`

Leave a game room.

**Payload:**
```json
{
  "gameId": "uuid"
}
```

**Server Response:**
- `gameLeft` - Successfully left game

---

#### `requestGameState`

Request current game state.

**Payload:**
```json
{
  "gameId": "uuid"
}
```

**Server Response:**
- `gameStateUpdate` - Current game state
- `gameError` - Game not found

---

### Server → Client Events

#### `roomJoined`

Emitted when successfully joined a room.

**Payload:**
```json
{
  "gameId": "uuid",
  "roomCode": "ABC123"
}
```

---

#### `roomCreated`

Emitted when a room is created.

**Payload:**
```json
{
  "roomCode": "ABC123"
}
```

---

#### `roomError`

Emitted when a room operation fails.

**Payload:**
```json
{
  "error": "Room not found"
}
```

---

#### `gameStarted`

Emitted when a game starts.

**Payload:**
```json
{
  "gameId": "uuid",
  "state": {
    "id": "uuid",
    "board": [...],
    "whiteState": {...},
    "blackState": {...},
    "status": "active",
    "startedAt": 1234567890
  }
}
```

---

#### `gameStateUpdate`

Emitted when game state changes (moves, energy updates, etc.).

**Payload:**
```json
{
  "id": "uuid",
  "board": [...],
  "whiteState": {
    "energy": 10,
    "energyRegenRate": 1.5,
    "pieceCooldowns": {...}
  },
  "blackState": {...},
  "status": "active",
  "lastMoveAt": 1234567890
}
```

---

#### `gameEnded`

Emitted when a game ends.

**Payload:**
```json
{
  "gameId": "uuid",
  "winner": "white",
  "state": {...}
}
```

---

#### `gameWaiting`

Emitted when game is waiting for players.

**Payload:**
```json
{
  "gameId": "uuid"
}
```

---

#### `playerJoined`

Emitted when another player joins the game room.

**Payload:**
```json
{
  "gameId": "uuid",
  "userId": "uuid"
}
```

---

#### `moveAccepted`

Emitted when a move is accepted.

**Payload:**
```json
{
  "move": {
    "fromRow": 6,
    "fromCol": 4,
    "toRow": 4,
    "toCol": 4
  }
}
```

---

#### `moveRejected`

Emitted when a move is rejected.

**Payload:**
```json
{
  "reason": "Piece on cooldown"
}
```

---

#### `matchFound`

Emitted when a match is found (matchmaking).

**Payload:**
```json
{
  "gameId": "uuid"
}
```

---

#### `matchmakingStarted`

Emitted when matchmaking starts.

**Payload:**
```json
{
  "queueSize": 5
}
```

---

#### `matchmakingCancelled`

Emitted when matchmaking is cancelled.

---

#### `matchmakingStatus`

Emitted in response to `getMatchmakingStatus`.

**Payload:**
```json
{
  "inQueue": true,
  "queueInfo": {
    "joinedAt": 1234567890,
    "timeInQueue": 5000
  },
  "queueSize": 3
}
```

---

#### `matchmakingError`

Emitted when matchmaking fails.

**Payload:**
```json
{
  "error": "Failed to join matchmaking queue"
}
```

---

#### `spectatingStarted`

Emitted when spectating starts.

**Payload:**
```json
{
  "gameId": "uuid"
}
```

---

#### `spectateError`

Emitted when spectating fails.

**Payload:**
```json
{
  "error": "Game not found"
}
```

---

#### `gameError`

Emitted when a game operation fails.

**Payload:**
```json
{
  "error": "Game not found"
}
```

---

#### `gameLeft`

Emitted when successfully left a game.

**Payload:**
```json
{
  "gameId": "uuid"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Invalid input data
- `AUTHENTICATION_ERROR` - Authentication failed
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `INTERNAL_ERROR` - Server error

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

- Move attempts: 10 per second per user
- API requests: Standard rate limiting applies

---

## Health Check

### GET `/health`

Check server health status.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

