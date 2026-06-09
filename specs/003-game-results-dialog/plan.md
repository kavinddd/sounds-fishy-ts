# Implementation Plan: Game Results Dialog

**Branch**: `003-game-results-dialog` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-game-results-dialog/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Display a post-game results dialog when the game ends, showing winner, 1st runner, 2nd runner, and a full ranked scoreboard of all players with their final scores. The dialog requires manual dismissal and transitions players back to the room lobby. The server already emits `game:end` with all required data — the frontend needs to consume this event and render the dialog.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)

**Primary Dependencies**: React 18+, TailwindCSS 3.x, Socket.IO client (existing in frontend), `@sounds-fishy/shared` types

**Storage**: N/A — frontend-only feature, no persistence

**Testing**: Manual testing with 3+ players for game flow verification; backend integration tests already cover `game:end` event emission

**Target Platform**: Web browser (modern Chrome/Firefox/Safari)

**Project Type**: Web application — frontend React component

**Performance Goals**: Dialog renders instantly (<100ms), dismiss triggers immediate smooth transition to lobby

**Constraints**: Mobile-first responsive design; must match existing dialog patterns (see `EliminationDialog.tsx`); must handle Set→Array serialization for client state

**Scale/Scope**: Single React component + socket event listener + state wiring

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Requirement | Status |
|------|------------|--------|
| I | TypeScript strict mode — typecheck must pass | ✅ PASS — no new types needed beyond existing `GameEndDetail` in shared package |
| II | TDD — tests before implementation | ✅ PASS — backend already has integration tests for `game:end`; frontend tested manually with 3+ players |
| III | Real-time Set serialization | ⚠️ WARN — `game:end` event payload uses `Record<SocketId, number>` which serializes correctly; no Sets involved |
| IV | Mobile-first responsive UI | ✅ PASS — dialog component built mobile-first following TailwindCSS patterns |
| V | Result type error handling | ✅ PASS — frontend component, no business logic requiring neverthrow |

**Gate verdict**: ✅ All gates pass. No violations to track. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/003-game-results-dialog/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── events.md        # Phase 1 output
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/frontend/src/
├── components/
│   ├── GameResultsDialog.tsx   # NEW - the results dialog component
│   └── GameView.tsx            # MODIFY - integrate results dialog
├── context/
│   └── SocketContext.tsx       # MODIFY - handle game:end event
└── hooks/
    └── useSocket.ts            # MODIFY (no changes needed) - expose gameEndDetail

packages/shared/src/
├── event.ts                    # Already has GameEndDetail type - no changes needed
└── io.ts                       # Already has types - no changes needed
```

**Structure Decision**: Frontend-only feature. All changes confined to `apps/frontend/src/`. The `GameResultsDialog` follows the existing `EliminationDialog` pattern and is wired through `GameView.tsx` and `SocketContext.tsx`.

## Complexity Tracking

> No constitution violations to justify.
