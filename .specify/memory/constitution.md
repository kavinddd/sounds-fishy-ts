<!--
Sync Impact Report:
- Version change: 0.0.0 → 1.0.0
- Modified principles: None (initial constitution)
- Added sections: Core Principles (5), Technology Stack, Development Workflow, Governance
- Removed sections: None
- Templates requiring updates:
  - ✅ plan-template.md - Constitution Check section already references constitution
  - ✅ spec-template.md - No constitution-specific sections
  - ✅ tasks-template.md - No constitution-specific sections
  - ✅ checklist-template.md - No constitution-specific sections
  - ✅ commands - No outdated references
- Follow-up TODOs: None
-->

# Sounds Fishy Constitution

## Core Principles

### I. TypeScript Strict Mode
All code MUST pass strict TypeScript checks before committing. Run `pnpm typecheck` in both frontend and backend packages. Type safety is non-negotiable.

### II. Test-Driven Development
Tests MUST be written before implementation. Red-Green-Refactor cycle strictly enforced. Backend requires unit and integration tests; frontend requires manual testing with 3+ players for game flow verification.

### III. Real-time State Synchronization
Socket.IO state synchronization MUST handle JavaScript Set serialization correctly. Server internal state uses `Set<SocketId>` but client state MUST receive `SocketId[]`. Convert Sets to Arrays in `makeGameClientState()` before broadcasting.

### IV. Mobile-First Responsive UI
Frontend development MUST use mobile-first responsive design with TailwindCSS. Use `lg:` breakpoint for desktop overrides. Custom theme colors defined in `index.css`.

### V. Result Type Error Handling
Business logic MUST use `neverthrow` for Result types. Async API routes MUST use try/catch with typed error responses.

## Technology Stack

Turbo monorepo using pnpm with the following structure:
- **apps/frontend**: Vite + React + TailwindCSS (port 3000)
- **apps/backend**: Hono + Socket.IO backend (port 3001)
- **packages/shared**: Shared TypeScript types

Testing infrastructure:
- Vitest for backend tests (unit + integration)
- PostgreSQL via Docker (port 5433) for test database
- Drizzle ORM for schema management

Code style:
- Files: kebab-case, Components: PascalCase, Functions/variables: camelCase, Constants: SCREAMING_SNAKE_CASE
- Formatting: 2 spaces, single quotes, trailing commas, semicolons
- Module resolution: bundler (frontend/shared), ESNext (backend)

## Development Workflow

All changes MUST verify compliance before committing:
1. Run `pnpm typecheck` - must pass in both frontend and backend
2. Run `pnpm lint` - must pass in all packages
3. Tests MUST pass (`pnpm test`)

Game-specific verification:
- Backend integration tests may be flaky due to Socket.IO async broadcasts
- When testing round transitions, verify server state (`rooms.get()`) rather than client state
- Manual testing requires 3+ players for complete game flow

## Governance

**Version**: 1.0.0 | **Ratified**: 2026-05-15 | **Last Amended**: 2026-05-15

### Amendment Procedure

1. **MINOR** (e.g., 1.0.0 → 1.1.0): New principle added or materially expanded guidance
2. **MAJOR** (e.g., 1.0.0 → 2.0.0): Backward incompatible governance/principle removals or redefinitions
3. **PATCH** (e.g., 1.0.0 → 1.0.1): Clarifications, wording, typo fixes, non-semantic refinements

### Compliance Review

All PRs and reviews MUST verify:
- TypeScript strict mode compliance
- Test coverage for new features
- Mobile-first responsive design (frontend)
- Result type error handling patterns

Constitution supersedes all other practices. Use AGENTS.md for runtime development guidance.