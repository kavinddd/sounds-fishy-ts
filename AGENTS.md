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

## Best Practices

1. Run `pnpm typecheck` before committing
2. Run `pnpm lint` to catch issues
3. Use shared package for types used in both apps
4. Keep components small and focused
