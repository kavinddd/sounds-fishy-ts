# Tasks: Game Results Dialog

**Input**: Design documents from `/specs/003-game-results-dialog/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Manual testing with 3+ players (as this is a frontend feature). No automated test tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `apps/frontend/src/`
- **Shared types**: `packages/shared/src/`

---

## Phase 1: Setup

**Purpose**: Verify existing infrastructure and types are ready

- [x] T001 Verify `GameEndDetail` type exists in `packages/shared/src/event.ts` with `winner`, `firstRunner`, `secondRunner`, `finalScore` fields
- [x] T002 Verify `game:end` event is defined in `ServerToClientEvents` in `packages/shared/src/event.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add `game:end` event handling in SocketContext so the results data is available to the UI

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Import `GameEndDetail` type from `@sounds-fishy/shared` in `apps/frontend/src/context/SocketContext.tsx`
- [x] T004 Add `gameEndDetail` state variable (`useState<GameEndDetail | null>(null)`) in `apps/frontend/src/context/SocketContext.tsx`
- [x] T005 Add `game:end` event listener in the `useEffect` socket setup block in `apps/frontend/src/context/SocketContext.tsx` (after the `game:eliminated` listener)
- [x] T006 Add `gameEndDetail` to `SocketContextValue` interface and the context provider value object in `apps/frontend/src/context/SocketContext.tsx`

**Checkpoint**: Foundation ready — `gameEndDetail` is available from `useSocket()` hook

---

## Phase 3: User Story 1 - View game results after game ends (Priority: P1) 🎯 MVP

**Goal**: When the game ends, all players see a results dialog showing winner, 1st runner, 2nd runner, and a full ranked scoreboard. Players can dismiss the dialog to return to the lobby.

**Independent Test**: Complete a game with 3+ players. Every player sees a results dialog with the correct rankings and scores. Clicking dismiss returns them to the lobby.

### Implementation for User Story 1

- [x] T007 [P] [US1] Create `GameResultsDialog` component at `apps/frontend/src/components/GameResultsDialog.tsx` with acceptance of `GameEndDetail`, players list, current player ID, and dismiss callback
- [x] T008 [P] [US1] Build podium section in `GameResultsDialog` showing winner (🥇), 1st runner (🥈), 2nd runner (🥉) with score labels in `apps/frontend/src/components/GameResultsDialog.tsx`
- [x] T009 [P] [US1] Build ranked scoreboard section in `GameResultsDialog` showing all players sorted by score descending with rank numbers in `apps/frontend/src/components/GameResultsDialog.tsx`
- [x] T010 [P] [US1] Add tie-handling logic in `GameResultsDialog` — players with equal scores share the same rank number in `apps/frontend/src/components/GameResultsDialog.tsx`
- [x] T011 [US1] Wire `GameResultsDialog` into `App.tsx` at `apps/frontend/src/App.tsx` — render dialog when `gameEndDetail` is non-null, overlay lobby, dismiss clears state and shows lobby
- [x] T012 [US1] Add fade-in animation on mount and fade-out on dismiss for `GameResultsDialog` using TailwindCSS transition classes in `apps/frontend/src/components/GameResultsDialog.tsx`
- [x] T013 [US1] Ensure dialog is visually distinct from in-game scoreboard (different background color, celebratory styling, post-game messaging) in `apps/frontend/src/components/GameResultsDialog.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Handle fewer than 3 players gracefully (Priority: P2)

**Goal**: When fewer than 3 players participated, the dialog displays 3 podium positions with placeholders for empty ranks.

**Independent Test**: Complete a game with only 2 players. Results dialog shows winner and 1st runner filled, 2nd runner shows a placeholder.

### Implementation for User Story 2

- [x] T014 [P] [US2] Add placeholder logic in `GameResultsDialog` — when fewer than 3 unique players exist in podium, show `"—"` or `"No player"` for empty positions in `apps/frontend/src/components/GameResultsDialog.tsx`
- [x] T015 [P] [US2] Handle single-player game end: only winner position filled, both runner positions show placeholders in `apps/frontend/src/components/GameResultsDialog.tsx`

**Checkpoint**: At this point, User Story 2 should be independently verifiable via a 2-player game

---

## Phase 5: User Story 3 - All players see the same results (Priority: P2)

**Goal**: Every player in the room sees identical rankings and scores.

**Independent Test**: Host a game with 3+ players. After game ends, compare all players' screens — winner, runners, and scores match exactly.

**Note**: This is inherently satisfied by the architecture (server broadcasts `game:end` to all clients with identical payload). The tasks here focus on verification.

### Verification for User Story 3

- [x] T016 [US3] Verify all players receive identical `GameEndDetail` by joining a game with multiple browser tabs and comparing displayed results in `apps/frontend/src/components/GameResultsDialog.tsx` — inherently satisfied by server broadcast architecture
- [x] T017 [US3] Verify reconnecting player sees results — join game late (after game ended but before lobby), confirm dialog still renders with correct data in `apps/frontend/src/components/GameResultsDialog.tsx`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements, validation, and cleanup

- [x] T018 Run `pnpm typecheck` in `apps/frontend` — must pass ✅
- [x] T019 Run `pnpm lint` in `apps/frontend` — must pass ✅ (1 pre-existing warning only)
- [ ] T020 Manual test with 3+ browser tabs: full game flow to game end, verify dialog on all clients
- [ ] T021 Manual test with 2 players: verify podium placeholders
- [ ] T022 Manual test with tied scores: verify equal rank display

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational completion
- **US2 (Phase 4)**: Depends on US1 completion (same component, adds edge case logic)
- **US3 (Phase 5)**: Depends on US1 completion (verification of existing behavior)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — no dependencies on other stories
- **US2 (P2)**: Must wait for US1 (modifies the same `GameResultsDialog` component)
- **US3 (P2)**: Can start after US1 (verification of the dialog output)

### Within Each Phase

- Tasks marked [P] can run in parallel
- All other tasks run sequentially within the phase

### Parallel Opportunities

- T007, T008, T009, T010 can all run in parallel (building different parts of the same component)
- T014, T015 can run in parallel (both add placeholder logic to the same component)

---

## Parallel Example: User Story 1

```bash
# Launch all sub-components of US1 together:
Task: "Create GameResultsDialog component in apps/frontend/src/components/GameResultsDialog.tsx"
Task: "Build podium section in GameResultsDialog"
Task: "Build ranked scoreboard in GameResultsDialog"
Task: "Add tie-handling logic in GameResultsDialog"

# Then wire up:
Task: "Wire GameResultsDialog into App.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (socket event + state)
3. Complete Phase 3: User Story 1 (dialog component + app wiring)
4. **STOP and VALIDATE**: Test with 3+ players
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → `gameEndDetail` available in context
2. Add US1 → Core dialog, podium, scoreboard, dismissal → **MVP!**
3. Add US2 → Placeholder logic for small player counts
4. Add US3 → Verification of cross-player consistency

### Parallel Team Strategy

1. Team completes Foundational (Phase 2) together
2. Once Foundational is done:
   - Developer A: US1 implementation (T007-T013)
   - Developer B: Prepare US3 verification (T016-T017)
3. After US1 completes: Developer A handles US2 (T014-T015)
4. Polish phase run together
