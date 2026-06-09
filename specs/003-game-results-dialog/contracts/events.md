# Socket.IO Event Contract: game:end

## Direction

**Server → Client** (broadcast to all players in the room)

## Payload

```typescript
interface GameEndDetail {
  finalScore: Record<SocketId, number>;  // All players' final scores
  winner: SocketId;                       // 1st place
  firstRunner: SocketId;                  // 2nd place
  secondRunner: SocketId;                 // 3rd place
}
```

## Source

Defined in `packages/shared/src/event.ts`:

```typescript
export type ServerToClientEvents = {
  "game:end": (detail: GameEndDetail) => void;
};
```

## Server Emission

The server emits this event when the game-ending condition is met (blue fish eliminated or all red fish eliminated and all players have been master). It is broadcast to all sockets in the room. The emission happens after `room:sync` is broadcast with `isPlaying: false`.

See `apps/backend/src/game-server.ts` — `broadcastGameEndState()`.

## Client Handling

The frontend `SocketContext` listens for this event. On receipt:

1. Store the `GameEndDetail` in context state
2. The `App.tsx` component detects the state change and renders `GameResultsDialog`
3. The dialog is displayed above the lobby view until dismissed
4. On dismiss, the context state is cleared and the lobby is shown

## Related Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `game:end` | Server → Client | Game results after game ends (broadcast) |
| `room:sync` | Server → Client | Full state sync (isPlaying=false triggers lobby routing) |

## Edge Cases

- **Disconnect before game:end**: Player reconnects to room, receives `room:sync` with `isPlaying=false`, but never receives `game:end`. No dialog shown.
- **Race condition**: `game:end` and `room:sync` arrive in the same microtask. Both state updates are batched by React.
