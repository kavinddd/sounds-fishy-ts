# AGENTS.md - Sounds Fishy Monorepo

## Project Overview

Turbo monorepo using pnpm:
- **apps/frontend**: Vite + React + TailwindCSS
- **apps/backend**: Hono + Socket.IO backend
- **packages/shared**: Shared TypeScript types

## Build/Lint/Test Commands

### Root
```bash
pnpm build        # Build all
pnpm dev          # Dev mode
pnpm lint         # Lint all
pnpm test         # Test all
```

### Frontend (port 3000)
```bash
cd apps/frontend
pnpm dev          # Dev server
pnpm build        # Production build
pnpm lint         # ESLint
pnpm typecheck    # TypeScript
```

### Backend (port 3001)
```bash
cd apps/backend
pnpm dev          # Dev server
pnpm build        # TypeScript build
pnpm lint         # ESLint
pnpm typecheck    # TypeScript
```

### Running Single Test (Backend)
```bash
cd apps/backend

# Start test DB (first time or after schema changes)
pnpm test:docker:up
pnpm db:push

# Run specific test file
pnpm vitest run tests/unit/some-test.test.ts

# Run tests matching pattern
pnpm vitest run -t "test name"

# Watch mode for specific file
pnpm vitest tests/unit/some-test.test.ts

# Run unit or integration only
pnpm test:unit
pnpm test:integration

# Stop test DB
pnpm test:docker:down
```

## Code Style

### TypeScript
- Strict mode enabled
- Module resolution: `bundler` (frontend/shared), ESNext (backend)

### Naming
- Files: kebab-case (`api-handler.ts`)
- Components: PascalCase (`RoomPage.tsx`)
- Functions/variables: camelCase
- Constants: SCREAMING_SNAKE_CASE

### Formatting
- 2 spaces indentation
- Single quotes
- Trailing commas
- Semicolons

### Imports
- Use path aliases: `@sounds-fishy/shared`
- Absolute imports within packages

### React
- Functional components with hooks
- TypeScript interfaces for props
- Keep components small and focused

### Error Handling
- Use `neverthrow` for Result types in business logic
- Try/catch in async API routes
- Typed error responses

```ts
import { Result, ok, err } from 'neverthrow';

function validate(input: string): Result<string, Error> {
  if (!input) return err(new Error('Invalid'));
  return ok(input);
}
```

### TailwindCSS (Frontend)
- Mobile-first responsive design
- Use `lg:` breakpoint for desktop
- Custom theme colors in `index.css`

## Testing (Backend)

### Structure
```
apps/backend/tests/
├── unit/        # Fast, isolated tests
└── integration/ # Full HTTP/DB tests
```

### Running Tests
```bash
# Run all tests (may be flaky - see notes below)
cd apps/backend && pnpm vitest run

# Run specific test by name pattern
cd apps/backend && pnpm vitest run -t "game:eliminate"
cd apps/backend && pnpm vitest run -t "can eliminate all red fish"

# Run tests multiple times to check flakiness
for i in 1 2 3 4 5; do
  echo "Run $i:"
  pnpm vitest run 2>&1 | grep -E "Tests" | tail -1
done
```

### Flaky Tests: Socket.IO Broadcast Race

Backend integration tests can be flaky due to async Socket.IO.
After round-ending events, the server broadcasts TWICE:

1. After elimination (status="eliminate", round=N)
2. After round transition (status="select-hinter", round=N+1)

When tests listen for client state (`socket.on("room:sync", ...)`), they may receive
either broadcast first - this causes intermittent failures.

Symptom: `expected 1 to deeply equal 2` on round checks
Fix: Verify server state (`rooms.get()`) rather than client state

### Game Elimination Flow
```
1. Player eliminated in "eliminate" phase
2. Server broadcasts state (status="eliminate")
3. Server adds round to roundHistory
4. Check: isAllRedFishEliminated? isGameEnding?
5. If round ending:
   - Reassign roles (new master, new blue from survivors)
   - Broadcast new state (status="select-hinter", round++)
```

### Test Database
- PostgreSQL via Docker (port 5433)
- Config: `docker-compose.test.yml`
- Schema: Drizzle ORM

### Database Commands
```bash
pnpm db:generate  # Create migration
pnpm db:push      # Push schema
pnpm db:studio    # Open Drizzle Studio
```

### Frontend Testing
Manual testing requires 3+ players:
```bash
# Terminal 1: Backend
cd apps/backend && pnpm dev

# Terminal 2: Frontend  
cd apps/frontend && pnpm dev
```

## Game Flow (Frontend)

The game has 3 phases in `gameState.status`:
- `select-hinter`: Master selects a player to give a hint
- `hint`: Selected player submits a hint (red fish must NOT say answer, blue fish MUST say answer)
- `eliminate`: Master chooses who to eliminate

When a round ends (blue eliminated or all red eliminated), new round starts with fresh roles.

## Critical: Set Serialization

**JavaScript Set does NOT serialize to JSON** - it becomes `{}`. 

When sending data from server to client via Socket.IO:
- Server uses `Set<SocketId>` internally (in `ServerGameState`)
- Client must receive `SocketId[]` (in `ClientGameState`)
- Convert Sets to Arrays in `makeGameClientState()` before broadcasting

See `packages/shared/src/io.ts` for type definitions.

## Best Practices

1. Run `pnpm typecheck` before committing (both frontend and backend)
2. Run `pnpm lint` to catch issues
3. Use shared package for types used in both apps
4. Keep components small and focused
5. Always test with 3+ players for game flow verification
