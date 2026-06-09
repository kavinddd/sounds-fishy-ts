# Quickstart: Game Results Dialog

## Files to Create

1. `apps/frontend/src/components/GameResultsDialog.tsx` — New dialog component

## Files to Modify

1. `apps/frontend/src/context/SocketContext.tsx` — Add `game:end` listener and state
2. `apps/frontend/src/hooks/useSocket.ts` — Export `gameEndDetail` from context
3. `apps/frontend/src/App.tsx` — Integrate GameResultsDialog above RoomPage routing

## Step-by-Step

### Step 1: SocketContext — Add event listener and state

Add to imports:
```typescript
import type { GameEndDetail } from "@sounds-fishy/shared";
```

Add state variable:
```typescript
const [gameEndDetail, setGameEndDetail] = useState<GameEndDetail | null>(null);
```

Add event listener in `useEffect` (after existing listeners):
```typescript
newSocket.on("game:end", (detail: GameEndDetail) => {
  setGameEndDetail(detail);
});
```

Add to context value and `SocketContextValue` interface:
```typescript
gameEndDetail,
```

### Step 2: useSocket — Export gameEndDetail

Add `gameEndDetail` to the returned object from the hook.

### Step 3: Create GameResultsDialog component

```typescript
interface GameResultsDialogProps {
  detail: GameEndDetail;
  players: SocketId[];
  currentPlayerId: SocketId | null;
  onDismiss: () => void;
}
```

Key behaviors:
- Render when `detail` is non-null
- Show podium section: winner (🥇), 1st runner (🥈), 2nd runner (🥉) with scores
- Show full ranked scoreboard below podium for all players
- Always show 3 podium positions — use placeholder `"—"` for empty ranks (when fewer than 3 players)
- Manual dismissal only (no auto-dismiss) — "Back to Lobby" button
- Fade-in on mount, fade-out before unmount
- Use same player identity format as GameView scoreboard
- Visually distinct from in-game scoreboard (different colors/iconography to indicate game is over)

### Step 4: Integrate in App.tsx

Render the dialog at the app level (above the routing logic) so it persists even after `GameView` unmounts:

```typescript
function AppContent() {
  const { status, error, gameEndDetail } = useSocket();

  // Show results dialog if game has ended
  if (gameEndDetail) {
    return (
      <>
        {status === "in-room" && <RoomPage />}
        <GameResultsDialog
          detail={gameEndDetail}
          players={/* from roomState */}
          currentPlayerId={playerId}
          onDismiss={() => /* clear gameEndDetail */}
        />
      </>
    );
  }

  if (status === "in-game") { return <GameView />; }
  if (status === "in-room") { return <RoomPage />; }
  return <HomePage />;
}
```

The dialog overlays the lobby. When dismissed, `gameEndDetail` is cleared and the lobby is shown normally.

## Verification

1. Run `pnpm typecheck` in `apps/frontend` — must pass
2. Run `pnpm lint` in `apps/frontend` — must pass
3. Manual test with 3+ browser tabs:
   - Host a game, play through to game end (master eliminates blue fish or all red eliminated)
   - Verify all players see the results dialog with correct winner, runners, and scores
   - Verify fewer-than-3 game shows podium placeholders
   - Verify dismiss button transitions to lobby
   - Verify tied scores display correctly
