# Data Model: Game Results Dialog

## Domain Entity

### GameEndDetail

Already defined in `packages/shared/src/event.ts`:

```typescript
interface GameEndDetail {
  finalScore: Record<SocketId, number>;  // All players' final scores
  winner: SocketId;                       // 1st place
  firstRunner: SocketId;                  // 2nd place
  secondRunner: SocketId;                 // 3rd place
}
```

This is the payload of the `game:end` server-to-client event. No new shared types needed.

## Context State

### SocketContext (new state)

```typescript
gameEndDetail: GameEndDetail | null
```

- Set when `game:end` event is received
- Cleared when dialog is dismissed by user
- Exposed via context value and `useSocket()` hook

### App.tsx (routing integration)

```typescript
// When gameEndDetail is non-null, render GameResultsDialog instead of routing
// After dialog dismissed → clear gameEndDetail → route to RoomPage
```

## Component State Model

### GameResultsDialog (new presentational component)

```typescript
interface GameResultsDialogProps {
  detail: GameEndDetail;                   // Server-provided results
  players: SocketId[];                     // All players for display mapping
  currentPlayerId: SocketId | null;        // For "You" label
  onDismiss: () => void;                   // Called on close
}
```

Internal state:
- `isVisible: boolean` — controls fade-in animation

### Scoreboard Data (derived from GameEndDetail)

```typescript
// Sorted by score descending
interface ScoreboardEntry {
  rank: number;            // 1, 2, 3, ...
  socketId: SocketId;
  score: number;
  isTied: boolean;         // true if tied with previous rank
  label: "winner" | "first-runner" | "second-runner" | null;
}
```

## State Transitions

```
[game in progress]
    → game:end received
    → gameEndDetail set in SocketContext
    → GameResultsDialog renders in App.tsx
    → player sees podium + scoreboard

[dialog visible]
    → "Back to Lobby" button clicked
    → onDismiss() called
    → gameEndDetail cleared
    → dialog unmounts
    → App.tsx routes to RoomPage

[game:end never received due to disconnect]
    → room:sync with isPlaying=false routes to RoomPage
    → no dialog shown (graceful degradation)
```

## Data Flow

```
Server ──game:end──────────→ SocketContext ──gameEndDetail──→ App.tsx ──props──→ GameResultsDialog
Server ──room:sync─────────→ SocketContext ──setStatus()────→ App.tsx (delayed routing)
User  ──click dismiss─────→ GameResultsDialog ──onDismiss()→ App.tsx clears state → route to RoomPage
```

## Validation Rules

- `winner`, `firstRunner`, `secondRunner` must be valid player socket IDs
- `finalScore` must contain entries for all players
- If fewer than 3 players, `secondRunner` (and possibly `firstRunner`) should display placeholder
- Dialog should not render if `gameEndDetail` is null
