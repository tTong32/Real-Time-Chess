# Frontend Component Documentation

Complete reference for all React components in the Real-Time Chess frontend.

## Core Game Components

### `Board`

Main chess board component that renders the game state and handles piece interactions.

**Props:**
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { Board } from './components/Board';

<Board className="my-board" />
```

**Features:**
- Renders 8x8 chess board
- Highlights selected squares
- Shows piece cooldowns
- Handles piece selection and movement
- Supports both white and black perspectives

---

### `BoardEditor`

Component for creating and editing custom board configurations.

**Props:**
- `onSave?: (boardData: Piece[]) => void` - Callback when board is saved
- `initialBoard?: Piece[]` - Initial board configuration
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { BoardEditor } from './components/BoardEditor';

<BoardEditor 
  onSave={(boardData) => console.log(boardData)}
  initialBoard={[]}
/>
```

**Features:**
- Drag and drop piece placement
- Piece categorization (Front Row, Back Row, King, Custom)
- Board validation
- Save/load functionality

---

### `EnergyBar`

Displays player energy level with regeneration rate.

**Props:**
- `energy: number` - Current energy value
- `maxEnergy: number` - Maximum energy (default: 25)
- `color: 'white' | 'black'` - Player color
- `regenRate?: number` - Energy regeneration rate per second
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { EnergyBar } from './components/EnergyBar';

<EnergyBar 
  energy={15}
  maxEnergy={25}
  color="white"
  regenRate={1.5}
/>
```

**Features:**
- Visual energy bar with percentage
- Low energy warning (red when < 5)
- Regeneration rate display
- Color-coded for white/black players

---

### `EnergyRegenDisplay`

Displays energy regeneration rate information.

**Props:**
- `regenRate: number` - Regeneration rate per second
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { EnergyRegenDisplay } from './components/EnergyRegenDisplay';

<EnergyRegenDisplay regenRate={1.5} />
```

---

### `CooldownIndicator`

Shows cooldown timer for a piece.

**Props:**
- `cooldown: number` - Remaining cooldown in seconds
- `maxCooldown: number` - Maximum cooldown for the piece
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { CooldownIndicator } from './components/CooldownIndicator';

<CooldownIndicator cooldown={3.5} maxCooldown={5} />
```

**Features:**
- Circular progress indicator
- Time remaining display
- Visual feedback when cooldown is active

---

### `PieceCooldownList`

Lists all pieces with their current cooldown status.

**Props:**
- `cooldowns: Record<string, number>` - Map of piece positions to cooldown values
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { PieceCooldownList } from './components/PieceCooldownList';

<PieceCooldownList cooldowns={{ "0,0": 2.5, "0,1": 0 }} />
```

---

### `GameStatus`

Displays current game status and information.

**Props:**
- `status: 'waiting' | 'active' | 'finished'` - Game status
- `winner?: 'white' | 'black' | null` - Winner (if finished)
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { GameStatus } from './components/GameStatus';

<GameStatus status="active" />
```

---

### `MoveValidationFeedback`

Shows feedback for move validation (legal/illegal moves).

**Props:**
- `isValid: boolean | null` - Move validity (null = no feedback yet)
- `message?: string` - Feedback message
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { MoveValidationFeedback } from './components/MoveValidationFeedback';

<MoveValidationFeedback 
  isValid={false}
  message="Piece on cooldown"
/>
```

---

### `IllegalMoveWarning`

Displays warning for illegal move attempts.

**Props:**
- `message: string` - Warning message
- `onDismiss?: () => void` - Callback when dismissed
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { IllegalMoveWarning } from './components/IllegalMoveWarning';

<IllegalMoveWarning 
  message="Not enough energy"
  onDismiss={() => {}}
/>
```

---

## Matchmaking Components

### `MatchmakingUI`

UI for matchmaking queue and status.

**Props:**
- `onCancel?: () => void` - Callback when matchmaking is cancelled
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { MatchmakingUI } from './components/MatchmakingUI';

<MatchmakingUI onCancel={() => {}} />
```

**Features:**
- Queue status display
- Cancel matchmaking button
- Loading states
- Match found notification

---

### `RoomCodeInput`

Input component for joining games via room code.

**Props:**
- `onJoin: (roomCode: string) => void` - Callback when room code is submitted
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { RoomCodeInput } from './components/RoomCodeInput';

<RoomCodeInput onJoin={(code) => console.log(code)} />
```

**Features:**
- 6-character room code input
- Validation
- Join button

---

### `FriendChallengeUI`

UI for challenging friends to games.

**Props:**
- `friends: Friend[]` - List of friends
- `onChallenge: (friendId: string) => void` - Callback when friend is challenged
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { FriendChallengeUI } from './components/FriendChallengeUI';

<FriendChallengeUI 
  friends={friendsList}
  onChallenge={(id) => {}}
/>
```

---

### `SpectateGameList`

Lists active games available for spectating.

**Props:**
- `games: Game[]` - List of active games
- `onSpectate: (gameId: string) => void` - Callback when game is selected
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { SpectateGameList } from './components/SpectateGameList';

<SpectateGameList 
  games={activeGames}
  onSpectate={(id) => {}}
/>
```

---

## Social Components

### `FriendList`

Displays list of friends.

**Props:**
- `friends: Friend[]` - List of friends
- `onRemove?: (friendId: string) => void` - Callback when friend is removed
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { FriendList } from './components/FriendList';

<FriendList 
  friends={friendsList}
  onRemove={(id) => {}}
/>
```

---

### `FriendSearch`

Component for searching and adding friends.

**Props:**
- `onSearch: (email: string) => void` - Callback when search is performed
- `onSendRequest?: (userId: string) => void` - Callback when friend request is sent
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { FriendSearch } from './components/FriendSearch';

<FriendSearch 
  onSearch={(email) => {}}
  onSendRequest={(id) => {}}
/>
```

---

### `PendingFriendRequests`

Displays pending friend requests.

**Props:**
- `requests: FriendRequest[]` - List of pending requests
- `onAccept?: (requestId: string) => void` - Callback when request is accepted
- `onReject?: (requestId: string) => void` - Callback when request is rejected
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { PendingFriendRequests } from './components/PendingFriendRequests';

<PendingFriendRequests 
  requests={pendingRequests}
  onAccept={(id) => {}}
  onReject={(id) => {}}
/>
```

---

## UI Components

### `LoadingSpinner`

Reusable loading spinner component.

**Props:**
- `size?: 'sm' | 'md' | 'lg'` - Spinner size (default: 'md')
- `label?: string` - Loading label text
- `fullScreen?: boolean` - Show as full-screen overlay
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { LoadingSpinner } from './components/LoadingSpinner';

<LoadingSpinner size="lg" label="Loading game..." />
<LoadingSpinner fullScreen />
```

---

### `AnimatedTransition`

Wrapper component for animated transitions.

**Props:**
- `show: boolean` - Whether to show the content
- `animation?: 'fade' | 'slide' | 'scale'` - Animation type (default: 'fade')
- `duration?: number` - Animation duration in ms (default: 300)
- `children: React.ReactNode` - Content to animate
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { AnimatedTransition } from './components/AnimatedTransition';

<AnimatedTransition show={isVisible} animation="slide">
  <div>Content</div>
</AnimatedTransition>
```

---

### `ThemeToggle`

Toggle between light and dark themes.

**Props:**
- `className?: string` - Additional CSS classes

**Usage:**
```tsx
import { ThemeToggle } from './components/ThemeToggle';

<ThemeToggle />
```

**Features:**
- Toggles between light/dark mode
- Persists preference in localStorage
- Respects system preference

---

## Route Components

### `ProtectedRoute`

Route wrapper that requires authentication.

**Props:**
- `children: React.ReactNode` - Content to protect
- `redirectTo?: string` - Redirect path if not authenticated (default: '/login')

**Usage:**
```tsx
import { ProtectedRoute } from './components/ProtectedRoute';

<ProtectedRoute>
  <UserProfile />
</ProtectedRoute>
```

---

## Context Providers

### `AuthContext`

Provides authentication state and methods.

**Usage:**
```tsx
import { useAuth } from './contexts/AuthContext';

const { user, login, logout, isAuthenticated } = useAuth();
```

**Methods:**
- `login(email: string, password: string)` - Login user
- `logout()` - Logout user
- `signup(email: string, password: string)` - Sign up new user

**State:**
- `user: User | null` - Current user
- `isAuthenticated: boolean` - Authentication status
- `loading: boolean` - Loading state

---

### `GameContext`

Provides game state and methods.

**Usage:**
```tsx
import { useGame } from './contexts/GameContext';

const { gameState, makeMove, selectedSquare } = useGame();
```

**Methods:**
- `makeMove(from: Square, to: Square)` - Make a move
- `handleSquareClick(row: number, col: number)` - Handle square click
- `selectSquare(row: number, col: number)` - Select a square

**State:**
- `gameState: GameState | null` - Current game state
- `selectedSquare: Square | null` - Currently selected square
- `isWhitePlayer: boolean` - Whether user is white player

---

### `SocketContext`

Provides Socket.IO connection and methods.

**Usage:**
```tsx
import { useSocket } from './contexts/SocketContext';

const { socket, isConnected } = useSocket();
```

**State:**
- `socket: Socket | null` - Socket.IO instance
- `isConnected: boolean` - Connection status

---

## Type Definitions

### `Piece`

```typescript
interface Piece {
  row: number;
  col: number;
  type: PieceType;
  color: 'white' | 'black';
}
```

### `GameState`

```typescript
interface GameState {
  id: string;
  board: (Piece | null)[][];
  whiteState: PlayerState;
  blackState: PlayerState;
  status: 'waiting' | 'active' | 'finished';
  winner?: 'white' | 'black' | null;
  lastMoveAt?: number;
}
```

### `PlayerState`

```typescript
interface PlayerState {
  energy: number;
  energyRegenRate: number;
  pieceCooldowns: Record<string, number>;
}
```

### `Friend`

```typescript
interface Friend {
  id: string;
  elo: number;
  createdAt: string;
  friendshipId: string;
  friendshipCreatedAt: string;
}
```

---

## Styling

All components use Tailwind CSS for styling. Custom classes are defined in `index.css`:

- `.energy-bar` - Energy bar container
- `.cooldown-indicator` - Cooldown indicator
- `.board-square` - Chess board square
- `.piece` - Chess piece
- `.game-status` - Game status display

Components support dark mode via the `dark` class on the root element.

---

## Testing

All components have corresponding test files using Vitest and React Testing Library. Run tests with:

```bash
npm test
```

