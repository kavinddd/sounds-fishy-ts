---

description: "Task list for Elimination Visual Feedback feature implementation"

---

# Tasks: Elimination Visual Feedback

**Input**: Design documents from `specs/002-elimination-visual-feedback/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested — manual testing with 3+ players per constitution

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `apps/frontend/src/`
- **Shared package**: `packages/shared/src/`
- Paths reference real files in the existing monorepo

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

No tasks required — this feature is additive to the existing frontend. No new project initialization, dependencies, or configuration needed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Socket event integration that MUST be complete before any user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 Add `game:eliminated` event listener and `eliminationDetail` state variable to `apps/frontend/src/context/SocketContext.tsx` — import `EliminatedDetail` from `@sounds-fishy/shared`, add `const [eliminationDetail, setEliminationDetail] = useState<EliminatedDetail | null>(null)`, register `newSocket.on("game:eliminated", ...)` in the useEffect, add `eliminationDetail` to the `SocketContextValue` interface and context value object
- [X] T002 Export `eliminationDetail` from `apps/frontend/src/hooks/useSocket.ts` by adding it to the return object of the hook

**Checkpoint**: Foundation ready — `eliminationDetail` flows from Socket.IO event to React context

---

## Phase 3: User Story 1 — All players see elimination details when a fish is eliminated (Priority: P1) 🎯 MVP

**Goal**: When the master eliminates a player, all players see a centered closable dialog showing the eliminated player's identity, role badge (color-coded by red/blue), hint text, the same dialog is shown to all players including the eliminated player, and the dialog has fade-in/fade-out animations.

**Independent Test**: Host a game with 3+ browser tabs, play to the eliminate phase, have the master eliminate a player, and verify that all tabs show a centered dialog with the player's identity (e.g., "Player abc1"), role badge ("Red Fish" or "Blue Fish" in corresponding color), the hint text, and a close button.

### Implementation

- [X] T003 [P] [US1] Create `EliminationDialog` component at `apps/frontend/src/components/EliminationDialog.tsx` — implement the presentational component with `EliminationDetail` props, player identity display (using same `P{index+1}` / "You" format as GameView scoreboard), role badge with label and color (`bg-red-500` for red, `bg-blue-500` for blue), hint text in a separate section, centered dialog with semi-transparent backdrop (`bg-black/50`, `z-50`, `rounded-2xl`), and fade-in/fade-out mounting animation
- [X] T004 [US1] Integrate `EliminationDialog` into `apps/frontend/src/components/GameView.tsx` — import the component, consume `eliminationDetail` from `useSocket()`, render `<EliminationDialog>` with the construction zone after `GameRulesDialog`, pass `detail`, `players`, `playerId`, and `onDismiss` props

**Checkpoint**: At this point, User Story 1 should be fully functional. The dialog appears for all players when an elimination occurs.

---

## Phase 4: User Story 2 — Players can close the dialog or let it auto-dismiss (Priority: P2)

**Goal**: The elimination dialog auto-dismisses after approximately 3 seconds, or immediately when the player clicks a visible close button. It also dismisses immediately when a game state update arrives (round transition).

**Independent Test**: After an elimination, verify (a) the dialog auto-dismisses after ~3s without interaction, (b) clicking the close button dismisses it immediately, and (c) a round transition (e.g., room:sync with new status) dismisses it immediately.

### Implementation

- [X] T005 [US2] Add 3-second auto-dismiss timer to `EliminationDialog` at `apps/frontend/src/components/EliminationDialog.tsx` — use `useEffect` with `setTimeout(3000)` that calls `onDismiss`, clean up timer on unmount, reset timer if `detail` prop changes (new elimination arrives)
- [X] T006 [US2] Add visible close button to `EliminationDialog` at `apps/frontend/src/components/EliminationDialog.tsx` — position at top-right of dialog, call `onDismiss` on click, style with close icon (✕)
- [X] T007 [US2] Add game state update dismissal to `GameView` at `apps/frontend/src/components/GameView.tsx` — add `useEffect` watching `gameState?.status`, dismiss dialog (set elimination to null) when status changes away from `"eliminate"`

**Checkpoint**: User Stories 1 AND 2 both function. The dialog appears, shows elimination info, and dismisses properly.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Edge case handling, responsive design, and quality verification

- [X] T008 [P] Add max-height and internal scrolling for long hint text in `EliminationDialog` at `apps/frontend/src/components/EliminationDialog.tsx` — constrain hint section with `max-h-32 overflow-y-auto`
- [X] T009 Handle multiple consecutive eliminations in `GameView` at `apps/frontend/src/components/GameView.tsx` — ensure new `eliminationDetail` replaces current dialog immediately (already natural with useState replacement) and auto-dismiss timer resets (handled in T005 useRef cleanup)
- [X] T010 Add responsive mobile layout to `EliminationDialog` at `apps/frontend/src/components/EliminationDialog.tsx` — on mobile: full-width (`w-full`), fills screen; on desktop: centered (`max-w-sm`); consistent with existing GameRulesDialog pattern
- [X] T011 [P] Run `pnpm typecheck` in `apps/frontend` — must pass with no type errors
- [X] T012 [P] Run `pnpm lint` in `apps/frontend` — must pass with no lint errors

**Checkpoint**: All tasks complete. Feature ready for manual testing with 3+ players.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — skip (no tasks)
- **Foundational (Phase 2)**: No external dependencies — T001 → T002 (sequential)
- **User Story 1 (Phase 3)**: Depends on T002 (useSocket export). T003 and T004 are sequential (create component first, then integrate)
- **User Story 2 (Phase 4)**: Depends on T004 (component must be integrated first). T005, T006, T007 are independent of each other
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 2 (P2)**: Can start after US1 is complete — adds dismiss behavior to existing dialog

### Within Each User Story

- Component creation before integration into GameView
- Core display (US1) before dismiss behaviors (US2)
- Story complete before moving to next priority

### Parallel Opportunities

- T003 (create component) and T001/T002 (Socket integration) — slightly overlapping (T003 needs T002, but can be authored in parallel if specs are clear)
- T005, T006, T007 (auto-dismiss, close button, round transition) — all modify different parts of code (EliminationDialog.tsx and GameView.tsx), can be implemented in parallel
- T008, T011, T012 (scrolling, typecheck, lint) — independent of each other

---

## Parallel Example: User Story 2

```bash
# Launch all US2 tasks together (different files / independent logic):
Task: "T005 Add 3-second auto-dismiss timer to EliminationDialog"
Task: "T006 Add visible close button to EliminationDialog"
Task: "T007 Add round transition dismissal to GameView"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001-T002)
2. Complete Phase 3: User Story 1 (T003-T004)
3. **STOP and VALIDATE**: Test User Story 1 independently with 3+ browser tabs
4. Deploy/demo if ready

### Incremental Delivery

1. Complete Foundational + US1 → Dialog appears with elimination info (MVP!)
2. Add US2 → Auto-dismiss and close button
3. Add Polish → Edge cases, responsive, typecheck/lint verification
4. Each phase adds value without breaking previous work

### Single Developer Strategy

1. T001 → T002 → T003 → T004 (sequential, foundational then US1)
2. T005 → T006 → T007 (sequential, US2 features)
3. T008 → T009 → T010 → T011 → T012 (polish and verify)

---

## Notes

- [P] tasks = different files, no dependencies
- [US1], [US2] labels map task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each logical task group
- Stop at any checkpoint to validate story independently
- The `EliminatedDetail` type is already defined in `packages/shared/src/event.ts` — no shared package changes needed
- Use existing dialog pattern from `GameRulesDialog.tsx` for styling reference
- Use existing role color utilities from `GameView.tsx` (`getRoleColor`, `getRoleLabel`) for consistency
