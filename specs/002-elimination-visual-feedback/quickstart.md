# Quickstart: Elimination Visual Feedback

## Files to Create

1. `apps/frontend/src/components/EliminationDialog.tsx` — New dialog component

## Files to Modify

1. `apps/frontend/src/context/SocketContext.tsx` — Add `game:eliminated` listener and state
2. `apps/frontend/src/hooks/useSocket.ts` — Export `eliminationDetail` from context
3. `apps/frontend/src/components/GameView.tsx` — Integrate EliminationDialog

## Step-by-Step

### Step 1: SocketContext — Add event listener and state

Add to imports:
```typescript
import type { EliminatedDetail } from "@sounds-fishy/shared";
```

Add state variable:
```typescript
const [eliminationDetail, setEliminationDetail] = useState<EliminatedDetail | null>(null);
```

Add event listener in `useEffect` (after existing listeners):
```typescript
newSocket.on("game:eliminated", (detail: EliminatedDetail) => {
  setEliminationDetail(detail);
});
```

Add to context value:
```typescript
eliminationDetail,
```

Add to `SocketContextValue` interface:
```typescript
eliminationDetail: EliminatedDetail | null;
```

### Step 2: useSocket — Export eliminationDetail

Just add to the returned object from the hook.

### Step 3: Create EliminationDialog component

```typescript
interface EliminationDialogProps {
  detail: EliminatedDetail;
  players: SocketId[];
  currentPlayerId: SocketId | null;
  onDismiss: () => void;
}
```

Key behaviors:
- Render when `detail` is non-null
- Auto-dismiss after 3000ms via `useEffect` with `setTimeout`
- Close button calls `onDismiss`
- Fade-in on mount, fade-out before unmount
- Color-coded by role: red-themed for red fish, blue-themed for blue fish
- Display player identity using same format as GameView scoreboard

### Step 4: Integrate in GameView

```typescript
const { eliminationDetail } = useSocket();
const [pendingDismiss, setPendingDismiss] = useState(false);

// Auto-dismiss on round transition
useEffect(() => {
  if (eliminationDetail && gameState?.status !== "eliminate") {
    setEliminationDetail(null);
  }
}, [gameState?.status]);
```

Render the dialog (after other modals, before closing button):
```typescript
{eliminationDetail && (
  <EliminationDialog
    detail={eliminationDetail}
    players={players}
    currentPlayerId={playerId}
    onDismiss={() => /* clear elimination detail */ }
  />
)}
```

## Verification

1. Run `pnpm typecheck` in `apps/frontend` — must pass
2. Run `pnpm lint` in `apps/frontend` — must pass
3. Manual test with 3+ browser tabs:
   - Host a game, play through to eliminate phase
   - Master eliminates a player
   - Verify all tabs show the dialog with correct role/hint/player display
   - Verify auto-dismiss after ~3s or on close button click
   - Verify round transition dismisses dialog immediately
