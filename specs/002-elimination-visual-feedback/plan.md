# Implementation Plan: Elimination Visual Feedback

**Branch**: `002-elimination-visual-feedback` | **Date**: 2026-05-25 | **Spec**: specs/002-elimination-visual-feedback/spec.md

**Input**: Feature specification from `specs/002-elimination-visual-feedback/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Add a centered color-coded closable dialog to the frontend GameView that displays when a player is eliminated (red fish or blue fish), showing the eliminated player's role, hint, and identity. The dialog auto-dismisses after 3 seconds or immediately on close button click or game state update. Implements a new `game:eliminated` Socket.IO event listener in SocketContext.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode enabled)

**Primary Dependencies**: React 19, Socket.IO client, TailwindCSS v4 (existing frontend stack)

**Storage**: N/A (ephemeral UI state — no persistence needed)

**Testing**: Manual testing with 3+ players (as per constitution's frontend testing guidance)

**Target Platform**: Web — desktop (centered dialog in main content area) and mobile (full-width dialog)

**Project Type**: Web application (frontend component in existing React + Vite app)

**Performance Goals**: N/A (simple dialog with no measurable performance impact)

**Constraints**: Auto-dismiss within 3 seconds; must handle rapid consecutive eliminations (replace current dialog, reset timer); must dismiss immediately on room:sync for new round; must work with existing mobile-first responsive design

**Scale/Scope**: Single reusable EliminationDialog component + SocketContext event listener addition

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Justification |
|-----------|--------|---------------|
| I. TypeScript Strict Mode | ✅ PASS | All new code must pass `pnpm typecheck` in frontend package |
| II. Test-Driven Development | ✅ PASS | Manual testing with 3+ players per constitution's frontend testing guidance |
| III. Real-time State Sync | ✅ PASS | Must listen for `game:eliminated` Socket.IO event; no Set serialization concerns (event payload uses plain types) |
| IV. Mobile-First Responsive UI | ✅ PASS | Dialog must follow mobile-first pattern with lg: breakpoint for desktop overrides |
| V. Result Type Error Handling | ✅ PASS | N/A — this is a display-only UI component, not business logic |

**No violations found. Complexity tracking is not required.**

## Project Structure

### Documentation (this feature)

```text
specs/002-elimination-visual-feedback/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/frontend/src/
├── context/
│   └── SocketContext.tsx    # Add game:eliminated event listener
├── components/
│   ├── EliminationDialog.tsx  # NEW — main dialog component
│   └── GameView.tsx          # Integrate EliminationDialog
└── index.css                 # No changes needed (uses existing theme colors)

packages/shared/src/
├── event.ts                  # Already defines EliminatedDetail type
└── io.ts                     # Already defines ClientGameState
```

**Structure Decision**: Single dialog component in `apps/frontend/src/components/` (following existing component pattern), event listener added to `SocketContext.tsx` (following existing socket listener pattern), no changes to backend or shared package.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
