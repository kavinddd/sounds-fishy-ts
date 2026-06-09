# Research: Game Results Dialog

## Socket.IO Event Integration

- **Decision**: Add `game:end` listener in `SocketContext.tsx` following the existing pattern in the same `useEffect` block where other listeners are registered (`room:chat`, `game:error`, `game:eliminated`)
- **Rationale**: All socket event listeners are registered in a single `useEffect` in `SocketContext.tsx`. The event payload type (`GameEndDetail`) is already defined in `packages/shared/src/event.ts`.
- **Timing concern**: The server emits `game:end` and `room:sync` (with `isPlaying=false`) in quick succession. The `room:sync` causes `gameState` to become `null` and `status` to become `"in-room"` which unmounts `GameView`. The `game:end` listener must capture the event and store it **before** the `room:sync` triggers state changes. This can be handled by storing the `gameEndDetail` in context state — React batches state updates within the same microtask, so both updates are processed together.
- **Contract**:
  - Event: `game:end`
  - Payload: `GameEndDetail { finalScore: Record<SocketId, number>, winner: SocketId, firstRunner: SocketId, secondRunner: SocketId }`
  - No acknowledgement callback needed (server-to-client fire-and-forget)

## Dialog Display Timing

- **Decision**: Store `gameEndDetail` in SocketContext state. Show `GameResultsDialog` in `App.tsx` (not `GameView`) so it renders even after `GameView` unmounts due to `room:sync` setting `isPlaying=false`.
- **Rationale**: When `game:end` arrives, `room:sync` immediately follows with `isPlaying=false`, causing `App.tsx` to route to `RoomPage` (unmounting `GameView`). If the dialog is rendered inside `GameView`, it would unmount before the user can see it. Rendering at the `App.tsx` level ensures the dialog persists.
- **Alternatives considered**:
  - Rendering in `GameView` with delayed routing — requires modifying the routing logic and introducing delays
  - Rendering in `RoomPage` — clutters the lobby component with post-game logic

## Podium Display

- **Decision**: Show 3 podium positions (1st/2nd/3rd) at the top, followed by the full ranked scoreboard of all players
- **Rationale**: The spec requires showing winner, 1st runner, 2nd runner prominently, plus a full scoreboard. A two-section layout (podium + list) is the clearest UX.
- **Podium forties**: Show placeholder text ("—") when fewer than 3 players exist (per user clarification)

## Player Identity Mapping

- **Decision**: Use the same socket ID display format as the existing codebase (`Player {first 4 chars}` or `P{index + 1}`)
- **Rationale**: The codebase has no persistent player name system. The `GameEndDetail` carries socket IDs, not display names. The dialog will display players consistently with the in-game scoreboard.

## Dismissal and Lobby Transition

- **Decision**: Manual dismissal only (no auto-dismiss). Dismiss button transitions to lobby by clearing the `gameEndDetail` state, which allows `App.tsx` to route to `RoomPage`.
- **Rationale**: Per user clarification, no auto-dismiss. Players click "Back to Lobby" to proceed.

## Responsive Design

- **Decision**: Full-screen modal on mobile, centered `max-w-sm` dialog on desktop
- **Rationale**: Matches existing mobile-first pattern used by `EliminationDialog`, `GameRulesDialog`, Chat, and Scoreboard.

## Architecture

- `SocketContext.tsx`: Add event listener for `game:end`, store `GameEndDetail` in context state, expose it
- `useSocket.ts`: Export `gameEndDetail` from context
- `App.tsx`: Consume `gameEndDetail`, render `<GameResultsDialog>` when present (before routing to `RoomPage`)
- `GameResultsDialog.tsx`: New component — receives GameEndDetail, players list, playerId, dismiss callback. Shows podium + scoreboard.
