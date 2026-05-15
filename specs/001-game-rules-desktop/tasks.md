# Tasks: Desktop Game Rule Button

**Input**: Design documents from `/specs/001-game-rules-desktop/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Manual testing with 3+ players (per Constitution II) - no automated tests needed for this frontend UI feature

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Project Verification)

**Purpose**: Verify development environment is ready

Since this is an existing project (not new), setup consists of verifying the frontend is ready:

- [x] T001 Verify frontend dependencies are installed in apps/frontend
- [x] T002 Verify dev server runs without errors

---

## Phase 2: Foundational (Reference Implementation)

**Purpose**: Examine existing mobile implementation to understand patterns

This feature requires referencing the existing mobile implementation:

- [x] T003 [P] Examine existing mobile game rule button implementation in apps/frontend/src/
- [x] T004 [P] Examine existing mobile game rule dialog implementation in apps/frontend/src/
- [x] T005 Document component structure and patterns used in mobile version

**Checkpoint**: Mobile implementation patterns identified - can now implement desktop version

---

## Phase 3: User Story 1 - View Game Rules in Desktop View (Priority: P1) 🎯 MVP

**Goal**: Add game rule button to desktop that opens a dialog with game rules

**Independent Test**: Open desktop game view, click the game rule button, verify dialog opens and displays rules correctly

### Implementation for User Story 1

- [x] T006 [P] [US1] Locate the desktop game page component in apps/frontend/src/pages/
- [x] T007 [P] [US1] Locate or create the desktop bottom right screen component where button will be added
- [x] T008 [US1] Add game rule button to desktop bottom right screen using lg: breakpoint (per Constitution mobile-first design)
- [x] T009 [US1] Create or reuse game rule dialog component in apps/frontend/src/components/
- [x] T010 [US1] Implement dialog open/close state management
- [x] T011 [US1] Ensure dialog displays game rules content (reused from mobile)
- [x] T012 [US1] Implement close button functionality
- [x] T013 [US1] Implement click-outside-to-close functionality

**Checkpoint**: User can view game rules in desktop view - MVP complete

---

## Phase 4: User Story 2 - Game Rule Button Visibility (Priority: P1)

**Goal**: Ensure the game rule button is visible and accessible in desktop layout

**Independent Test**: Verify game rule button is visible in desktop interface without needing to search

### Implementation for User Story 2

- [x] T014 [US2] Position button appropriately in bottom right screen
- [x] T015 [US2] Apply appropriate styling to make button visually clear
- [x] T016 [US2] Verify button remains visible after dialog is opened and closed

**Checkpoint**: Button is visible and accessible in desktop view

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup

- [x] T017 [P] Run pnpm typecheck in apps/frontend to verify TypeScript compliance
- [x] T018 [P] Run pnpm lint in apps/frontend to verify code quality
- [x] T019 Manual testing: Verify dialog opens within 500ms (SC-002)
- [x] T020 Manual testing: Verify desktop content matches mobile version (SC-003)
- [x] T021 Manual testing: Verify open/close works without page reload (SC-004)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - needed to understand existing patterns
- **User Stories (Phase 3+)**: Foundational must complete first
- **Polish (Final Phase)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on User Story 1 completing (button must exist before visibility can be tested)

### Within Each User Story

- Reference existing code before implementing
- Button component before dialog
- Dialog state management before interaction features

### Parallel Opportunities

- T003, T004 (examine mobile implementation) can run in parallel
- T006, T007 (locate components) can run in parallel
- T017, T018 (typecheck and lint) can run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Examine mobile implementation in parallel:
Task: "Examine existing mobile game rule button implementation in apps/frontend/src/"
Task: "Examine existing mobile game rule dialog implementation in apps/frontend/src/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test game rule button and dialog in desktop view
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Mobile patterns understood
2. Add User Story 1 → Test → Deploy/Demo (MVP!)
3. Add User Story 2 → Test → Deploy/Demo
4. Polish phase → Full validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Reference mobile implementation for patterns and content reuse
- Use lg: breakpoint for desktop overrides (Constitution IV)
- Commit after each task or logical group
- Run typecheck and lint before committing
