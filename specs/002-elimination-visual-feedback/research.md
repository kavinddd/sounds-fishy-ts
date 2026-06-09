# Research: Elimination Visual Feedback

## Socket.IO Event Integration

- **Decision**: Add `game:eliminated` listener in `SocketContext.tsx` following the existing pattern (e.g., `room:chat`, `game:error`)
- **Rationale**: All socket event listeners are registered in the `useEffect` in `SocketContext.tsx`. The event payload type (`EliminatedDetail`) is already defined in `packages/shared/src/event.ts`.
- **Contract**:
  - Event: `game:eliminated`
  - Payload: `EliminatedDetail { socketId: SocketId, hint: string, role: "red" | "blue" }`
  - No acknowledgement callback needed (server-to-client fire-and-forget)

## Dialog Component Pattern

- **Decision**: Follow the `GameRulesDialog` pattern (controlled via `isOpen` prop, backdrop with `bg-black/50`, `z-50`, inner `e.stopPropagation()`)
- **Rationale**: `GameRulesDialog` is the existing modal pattern in the codebase. It uses a centered overlay with a backdrop, which matches FR-010 requirements.
- **Differences from GameRulesDialog**:
  - Must auto-dismiss after 3 seconds (use `useEffect` with `setTimeout`)
  - Must accept elimination data (`EliminationDetail`) as props
  - Must accept a `onDismiss` callback that fires on both auto-dismiss and manual close
  - Auto-dismiss timer must reset on new elimination (replacing dialog)
  - Must dismiss immediately on `room:sync` for new round

## Player Identity Mapping

- **Decision**: Use socket ID display format consistent with existing codebase (`Player {first 4 chars}` or `P{index + 1}`)
- **Rationale**: The codebase has no persistent player name system. Players are identified by truncated socket IDs throughout (GameView, RoomPage, ChatPanel). The `EliminationDetail` only carries `socketId`, not a display name. The dialog will display players the same way as the scoreboard.

## Color Theming

- **Decision**: Use existing TailwindCSS utility classes (`bg-red-500`, `bg-blue-500`, `text-red-500`, `text-blue-500`) consistent with `getRoleColor()` in GameView
- **Rationale**: The codebase uses hardcoded Tailwind color utilities for role colors (not custom CSS variables). Red/Blue role colors are `bg-red-500` and `bg-blue-500` respectively. No new theme variables needed.

## Responsive Design

- **Decision**: Full-screen modal on mobile, centered max-w-sm dialog on desktop
- **Rationale**: This matches existing mobile-first pattern used by `GameRulesDialog`, ChatPanel, and Scoreboard. Desktop: `max-w-sm` centered. Mobile: full-width with padding.

## Animation Approach

- **Decision**: Use TailwindCSS animation classes (`animate-fade-in`, custom fade-out) or inline CSS transitions
- **Rationale**: The codebase has no animation library (no framer-motion etc.). Keep it simple with Tailwind + CSS transitions. Use a state-based approach: mount → fade in, unmount → fade out.

## Multiple Consecutive Eliminations

- **Decision**: Store elimination state in GameView as a state variable; when new `game:eliminated` arrives, replace current state (not stack/queue) and reset timer
- **Rationale**: FR-008 requires replacement behavior. Using a single `eliminationDetail` state (instead of an array) naturally achieves this - each new event replaces the previous.

## Dismissal on Game State Update

- **Decision**: In GameView, add a `useEffect` watching `gameState.status`; when status changes (e.g., from "eliminate" to "select-hinter"), clear the elimination dialog
- **Rationale**: FR-009 requires dismissal on round transition. The `room:sync` event updates `gameState.status` in SocketContext, which GameView already consumes. A `useEffect` on `gameState.status` can trigger dialog dismissal.

## Architecture

- `SocketContext.tsx`: Add event listener for `game:eliminated`, store latest `EliminatedDetail` in context state, expose it
- `useSocket.ts`: Export the new `eliminationDetail` value from context
- `GameView.tsx`: Consume `eliminationDetail`, render `<EliminationDialog>` with auto-dismiss logic
- `EliminationDialog.tsx`: New pure presentational component - receives data, manages its own open/close with props
