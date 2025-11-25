## **Real-Time-Chess - Project Summary**

### **Core concept**
Real-time strategy chess: no turns. Players can move any available piece at any time. Pieces have cooldowns after moving, and moves cost energy.

### **Key mechanics**

1. **Cooldown system**
   - Each piece has a cooldown after moving (4–11 seconds)
   - Cooldowns count down in real time
   - Piece values: Pawn (4s), Knight (5s), Bishop (6s), Rook (7s), Queen (9s), King (11s)

2. **Energy system**
   - Moves cost energy (2–10 per piece)
   - Energy regenerates over time (starts at 0.5/sec, increases every 15s, max 10/sec)
   - Starting energy: 6, max: 25
   - Prevents constant spamming

3. **Real-time gameplay**
   - No turn-based structure
   - Both players can move simultaneously
   - Win condition: capture the opponent's king - there are no such things as checks
   - If both kings are captured simultaneously, winner is determined by piece point values (standard chess: Pawn=1, Knight/Bishop=3, Rook=5, Queen=9). Tie goes to white.
   - No time limits or stalemate conditions

4. **Custom-Boards**:
   - Each player has their own custom board where you can replace similar pieces
   - In general: pawn pieces can replace pawns
   - Any non-king/non-pawn piece can replace each other
   - There are different types of kings 

### **Custom pieces**
- **Twisted Pawn**: Moves diagonally forward, captures straight
- **Pawn General**: Reduces cooldown of adjacent friendly pieces by 2s (if on cooldown)
- **Flying Castle**: Rook that can jump over one blocking piece
- **Prince**: Moves like a knight, can prevent its own capture once per game
- **Ice Bishop**: Adds 3s to cooldown of adjacent enemy pieces (or sets to 3s if not on cooldown), but cannot exceed piece's maximum cooldown

### **Features**

1. **Multiplayer**
   - Socket.IO real-time sync
   - Room-based system (6-character codes)
   - Matchmaking for rated games
   - Play with friends (unrated)
   - Spectate active games

2. **AI opponent** (DO NOT DO YET)
   - Adjustable ELO (400–2800)
   - Real-time decision making
   - Understands cooldowns and energy

3. **User system**
   - Authentication (signup/login with email verification)
   - ELO rating (starts at 1000)
   - Friends system (add/remove/search)
   - Custom board editor (saved per user)
   - Game statistics tracking

4. **Board editor**
   - Create custom starting positions
   - Piece categorization (Front Row, Back Row, King, Custom)
   - Linked to user accounts

### **Tech stack**
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express + Socket.IO
- **Database**: MySQL with custom schema
- **Authentication**: Bcrypt password hashing, email verification tokens

### **Architecture**
- Client-server separation
- Real-time game state synchronization via Socket.IO
- Persistent storage for users, games, custom boards
- Protected routes and authentication context

### **Game flow**
1. User signs up/logs in
2. Choose: AI game, multiplayer (matchmaking or friend), or spectate
3. Game starts with real-time cooldowns and energy
4. Players move pieces when available (cooldown expired + enough energy)
5. First to capture the king wins (or highest points if simultaneous)
6. ELO updates (rated games)

The twist: combines chess strategy with RTS resource management (energy) and timing (cooldowns), making it fast-paced and tactical.