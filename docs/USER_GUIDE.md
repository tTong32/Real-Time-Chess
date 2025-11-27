# User Guide

Complete guide for playing Real-Time Chess.

## Getting Started

### Creating an Account

1. Navigate to the signup page
2. Enter your email address
3. Choose a password (minimum 6 characters)
4. Click "Sign Up"
5. Check your email for a verification link
6. Click the verification link to activate your account

### Logging In

1. Go to the login page
2. Enter your email and password
3. Click "Log In"
4. You'll be redirected to the main game interface

---

## Game Mechanics

### Real-Time Gameplay

Unlike traditional chess, Real-Time Chess has **no turns**. Both players can move pieces simultaneously at any time, creating fast-paced, strategic gameplay.

### Cooldown System

After moving a piece, it enters a cooldown period before it can move again:

- **Pawn**: 4 seconds
- **Knight**: 5 seconds
- **Bishop**: 6 seconds
- **Rook**: 7 seconds
- **Queen**: 9 seconds
- **King**: 11 seconds

**Visual Indicators:**
- Pieces on cooldown show a circular timer
- The cooldown countdown is visible on each piece
- You cannot move a piece while it's on cooldown

### Energy System

Every move costs energy. Energy regenerates over time, preventing constant spamming.

**Energy Costs:**
- **Pawn**: 2 energy
- **Knight**: 3 energy
- **Bishop**: 3 energy
- **Rook**: 4 energy
- **Queen**: 6 energy
- **King**: 10 energy

**Energy Mechanics:**
- Starting energy: 6
- Maximum energy: 25
- Initial regeneration: 0.5 energy/second
- Regeneration increases every 15 seconds
- Maximum regeneration: 10 energy/second

**Visual Indicators:**
- Energy bar shows current energy level
- Low energy (< 5) turns red
- Regeneration rate is displayed

### Win Condition

**Capture the opponent's king to win!**

- There are no checks or checkmates
- The game ends immediately when a king is captured
- If both kings are captured simultaneously, the winner is determined by:
  1. Total piece point values (Pawn=1, Knight/Bishop=3, Rook=5, Queen=9)
  2. Tie goes to white player

---

## Custom Pieces

### Available Custom Pieces

#### Twisted Pawn
- **Moves**: Diagonally forward
- **Captures**: Straight forward
- Replaces standard pawns

#### Pawn General
- **Ability**: Reduces cooldown of adjacent friendly pieces by 2 seconds (if on cooldown)
- Replaces standard pawns

#### Flying Castle
- **Ability**: Rook that can jump over one blocking piece
- Replaces rooks

#### Prince
- **Moves**: Like a knight
- **Ability**: Can prevent its own capture once per game
- Replaces knights, bishops, or rooks

#### Ice Bishop
- **Ability**: Adds 3 seconds to cooldown of adjacent enemy pieces (or sets to 3s if not on cooldown)
- Cannot exceed piece's maximum cooldown
- Replaces bishops

---

## Playing a Game

### Matchmaking (Rated Games)

1. Click "Find Match" or "Matchmaking"
2. Wait in the queue for an opponent
3. When a match is found, the game starts automatically
4. Your ELO rating changes based on the result

**Tips:**
- Matchmaking pairs players with similar ELO ratings
- You can cancel matchmaking at any time
- Rated games affect your ELO score

### Friend Games (Unrated)

1. **Creating a Room:**
   - Click "Play with Friends"
   - Click "Create Room"
   - Share the 6-character room code with your friend

2. **Joining a Room:**
   - Click "Play with Friends"
   - Enter the 6-character room code
   - Click "Join Room"

3. **Starting the Game:**
   - Once both players join, click "Start Game"
   - The game begins immediately

**Note:** Friend games do not affect your ELO rating.

### Making Moves

1. **Select a Piece:**
   - Click on a piece you want to move
   - The square will be highlighted

2. **Move the Piece:**
   - Click on a valid destination square
   - The piece moves if:
     - The move is legal
     - The piece is not on cooldown
     - You have enough energy

3. **Move Feedback:**
   - Green highlight = Move accepted
   - Red highlight = Move rejected (see reason)
   - Warning message = Illegal move attempt

### Spectating Games

1. Click "Spectate" in the main menu
2. Browse the list of active games
3. Click on a game to watch
4. You'll see the game state in real-time

**Note:** Spectators cannot interact with the game.

---

## Custom Boards

### Creating a Custom Board

1. Go to "Board Editor" from the main menu
2. Drag pieces onto the board
3. Arrange your custom starting position
4. Click "Save" and give it a name
5. Your board is saved to your account

### Using Custom Boards

- Custom boards can be used in friend games
- Select your custom board when creating a room
- Both players must have the same board configuration

### Board Rules

- **Exactly one white king and one black king** required
- **Pawns** can only replace other pawns
- **Non-king, non-pawn pieces** can replace each other
- **Kings** can be different types (if implemented)

---

## Friends System

### Adding Friends

1. Go to "Friends" in the main menu
2. Click "Search Friends"
3. Enter a friend's email address
4. Click "Send Request"
5. Wait for them to accept

### Accepting Friend Requests

1. Go to "Friends"
2. View "Pending Requests"
3. Click "Accept" or "Reject"

### Challenging Friends

1. Go to "Friends"
2. Find a friend in your list
3. Click "Challenge"
4. They'll receive a notification
5. Start a friend game together

### Removing Friends

1. Go to "Friends"
2. Find the friend you want to remove
3. Click "Remove"
4. Confirm the action

---

## User Profile

### Viewing Your Profile

1. Click on your profile icon or "Profile"
2. View your statistics:
   - Current ELO rating
   - Total games played
   - Wins and losses
   - Win rate
   - Total moves made

### Updating Your Profile

1. Go to your profile
2. Click "Edit Profile"
3. Update your email (if desired)
4. Save changes

**Note:** Changing your email requires re-verification.

---

## Tips and Strategies

### Energy Management

- **Don't spam moves** - Energy regenerates slowly at first
- **Plan ahead** - Save energy for critical moves
- **Wait for regeneration** - Sometimes it's better to wait
- **Use low-cost pieces** - Pawns are energy-efficient

### Cooldown Strategy

- **Move pieces in sequence** - While one piece cools down, use another
- **Protect key pieces** - Keep important pieces off cooldown when needed
- **Use cooldown timing** - Coordinate multiple piece movements

### Piece Selection

- **Pawns are fast** - Short cooldown, low energy cost
- **Kings are slow** - Long cooldown, high energy cost
- **Balance your pieces** - Mix fast and powerful pieces

### Real-Time Tactics

- **Watch your opponent** - React to their moves
- **Control the center** - Important in real-time chess
- **Protect your king** - It's the win condition
- **Use custom pieces** - They have unique abilities

### Custom Board Strategy

- **Experiment** - Try different starting positions
- **Balance** - Don't make your board too powerful
- **Test** - Play with friends to test your boards

---

## Troubleshooting

### Can't Log In

- **Check email verification** - Make sure you verified your email
- **Check password** - Ensure you're using the correct password
- **Try resetting** - Contact support if needed

### Game Not Starting

- **Check connection** - Ensure you're connected to the internet
- **Refresh page** - Sometimes a refresh helps
- **Check room code** - Make sure the room code is correct (friend games)

### Moves Not Working

- **Check cooldown** - The piece might be on cooldown
- **Check energy** - You might not have enough energy
- **Check legality** - The move might be illegal

### Connection Issues

- **Check internet** - Ensure stable connection
- **Reconnect** - The game will attempt to reconnect
- **Refresh** - Refresh the page if issues persist

---

## Keyboard Shortcuts

- **Space** - Pause/Resume (if implemented)
- **Esc** - Cancel current action
- **Enter** - Submit form/confirm action

---

## FAQ

### Q: Can I play against the computer?

A: AI opponents are planned but not yet implemented.

### Q: How is ELO calculated?

A: ELO changes based on wins/losses against opponents with different ratings. Wins against higher-rated players give more points.

### Q: Can I undo a move?

A: No, moves are final in real-time chess.

### Q: What happens if I disconnect?

A: The game will attempt to reconnect. If you're disconnected for too long, you may forfeit the game.

### Q: Can I play multiple games at once?

A: No, you can only play one game at a time.

### Q: Are there time limits?

A: No, there are no time limits. Games can last as long as needed.

### Q: Can I chat with my opponent?

A: Chat functionality is not currently implemented.

---

## Support

For issues, questions, or feedback:

- Check the troubleshooting section above
- Review the game mechanics documentation
- Contact support through the app (if available)

---

## Updates and Changes

The game is actively developed. New features, pieces, and improvements are added regularly. Check the changelog or release notes for updates.

---

Enjoy playing Real-Time Chess!

