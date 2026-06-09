# Socket.IO Event Contract: game:eliminated

## Direction

**Server → Client** (broadcast to all players in the room)

## Payload

```typescript
interface EliminatedDetail {
  socketId: SocketId;    // The eliminated player's socket ID
  hint: string;           // The hint the eliminated player gave
  role: "red" | "blue"; // The eliminated player's role (master cannot be eliminated)
}
```

## Source

Defined in `packages/shared/src/event.ts`:

```typescript
export type ServerToClientEvents = {
  "game:eliminated": (detail: EliminatedDetail) => void;
};
```

## Server Emission

The server emits this event immediately after a successful elimination (master calls `game:eliminate`). It is emitted to all sockets in the room, including the eliminated player.

## Client Handling

The frontend `SocketContext` listens for this event. On receipt:

1. Store the `EliminatedDetail` in context state
2. The `GameView` component detects the state change and renders `EliminationDialog`
3. The dialog auto-dismisses after 3 seconds or on manual close

## Related Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `game:eliminate` | Client → Server | Master eliminates a player (request) |
| `game:eliminated` | Server → Client | Notification of elimination (broadcast) |
| `room:sync` | Server → Client | Full state sync (dialog dismisses on round transition) |
