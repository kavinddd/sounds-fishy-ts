# Data Model: Elimination Visual Feedback

## Domain Entity

### EliminationDetail

Already defined in `packages/shared/src/event.ts`:

```typescript
interface EliminatedDetail {
  socketId: SocketId;    // Who was eliminated
  hint: string;           // Their last hint
  role: Exclude<Role, "master">;  // "red" or "blue"
}
```

This is the payload of the `game:eliminated` server-to-client event. No new shared types needed.

## Context State

### SocketContext (new state)

```typescript
eliminationDetail: EliminatedDetail | null
```

- Set when `game:eliminated` event is received
- Cleared when dialog is dismissed (auto or manual)
- Exposed via context value and `useSocket()` hook

## Component State Model

### GameView (integration)

```typescript
// Local state (derived from context)
const eliminationDetail: EliminatedDetail | null

// Effects:
// 1. When eliminationDetail changes → show dialog, reset 3s timer
// 2. When gameState.status changes → dismiss dialog (for round transition)

// Render:
<EliminationDialog
  detail={eliminationDetail}
  players={players}
  playerId={playerId}
  onDismiss={() => clear eliminationDetail}
/>
```

### EliminationDialog (presentational)

```typescript
interface EliminationDialogProps {
  detail: EliminatedDetail;              // The elimination data
  players: SocketId[];                    // For mapping socketId → display name
  currentPlayerId: SocketId | null;      // For "You" label
  onDismiss: () => void;                  // Called on close or auto-dismiss
}
```

Internal state:
- `isVisible: boolean` — controls fade-in/fade-out animation
- Transitions: `false → true` on mount (fade in), `true → false` on dismiss (fade out), then calls `onDismiss` after animation completes

## State Transitions

```
[GameView idle] 
    → game:eliminated received 
    → eliminationDetail set 
    → dialog renders 
    → 3s timer starts

[dialog visible] 
    → close button clicked 
    → onDismiss() called 
    → eliminationDetail cleared 
    → dialog unmounts

[dialog visible] 
    → 3s timer expires 
    → onDismiss() called 
    → eliminationDetail cleared 
    → dialog unmounts

[dialog visible] 
    → new game:eliminated received 
    → eliminationDetail replaced 
    → old timer cleared, new timer starts 
    → dialog re-renders with new data

[dialog visible] 
    → gameState.status changes (round transition) 
    → eliminationDetail cleared 
    → dialog unmounts immediately
```

## Data Flow

```
Server ──game:eliminated──→ SocketContext ──eliminationDetail──→ GameView ──props──→ EliminationDialog
Server ──room:sync────────→ SocketContext ──gameState──────────→ GameView (useEffect watches status)
User  ──click close──────→ EliminationDialog ──onDismiss()────→ GameView clears state
Timer ──3s elapsed────────→ EliminationDialog ──onDismiss()────→ GameView clears state
```

## Validation Rules

- `socketId` must be in `players` array (defensive check; server always sends valid IDs)
- `role` must be `"red"` or `"blue"` (already typed by TypeScript)
- `hint` may be empty string (edge case; display gracefully)
- Dialog should not render if `eliminationDetail` is null
