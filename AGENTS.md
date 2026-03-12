# AGENTS.md - Sounds Fishy Monorepo

## Project Overview

This is a Turbo monorepo using pnpm as the package manager. It contains:
- **apps/frontend**: Vite + React frontend application
- **apps/backend**: Hono backend API
- **packages/shared**: Shared TypeScript types used by both apps

## Build/Lint/Test Commands

### Root Commands (via Turbo)
```bash
# Build all packages
pnpm build

# Run all apps in development mode
pnpm dev

# Lint all packages
pnpm lint

# Test all packages
pnpm test

# Clean all build outputs
pnpm clean
```

### Individual App Commands

#### Frontend (apps/frontend)
```bash
cd apps/frontend

# Development server (port 3000)
pnpm dev

# Build for production
pnpm build

# Run linter
pnpm lint

# Run type checking
pnpm typecheck
```

#### Backend (apps/backend)
```bash
cd apps/backend

# Development server (port 3001)
pnpm dev

# Build (TypeScript compilation)
pnpm build

# Run linter
pnpm lint

# Run type checking
pnpm typecheck
```

#### Shared Package (packages/shared)
```bash
cd packages/shared

# Type checking only
pnpm typecheck
```

## Code Style Guidelines

### TypeScript Configuration
- All packages use strict TypeScript with `strict: true`
- Module resolution: `bundler` for frontend/shared, ESNext for backend
- Target: ES2022 (backend/shared), ES2020 (frontend)

### Imports
- Use path aliases defined in each package's tsconfig.json
- Shared package imports: `@sounds-fishy/shared`
- Always use absolute imports within packages

### Naming Conventions
- **Files**: kebab-case for files (e.g., `api-handler.ts`, `main.tsx`)
- **Components**: PascalCase (e.g., `App.tsx`, `UserProfile.tsx`)
- **Functions/variables**: camelCase
- **Interfaces**: PascalCase with `I` prefix optional (prefer descriptive names over prefixes)
- **Constants**: SCREAMING_SNAKE_CASE

### Formatting
- Use 2 spaces for indentation
- Always use semicolons
- Use single quotes for strings
- Add trailing commas
- Maximum line length: 100 characters

### React Patterns
- Use functional components with hooks
- Prefer composition over inheritance
- Use TypeScript interfaces for props
- Keep components small and focused

### Error Handling
- Use typed error responses via `ApiResponse<T>` from shared package
- Always handle async errors with try/catch in API routes
- Return appropriate HTTP status codes
- Use **neverthrow** for railway-oriented error handling in business logic

### Using neverthrow
neverthrow provides a `Result<T, E>` type for explicit error handling:

```ts
import { Result, ok, err } from 'neverthrow';

function validateEmail(email: string): Result<string, Error> {
  if (!email.includes('@')) {
    return err(new Error('Invalid email'));
  }
  return ok(email);
}

// Usage
const result = validateEmail('test@example.com');
if (result.isOk()) {
  console.log(result.value); // TypeScript knows this is safe
} else {
  console.error(result.error); // Handle the error
}

// Or use map//andThen for chaining
validateEmail('test@example.com')
  .map(email => email.toLowerCase())
  .mapErr(e => new Error('Validation failed: ' + e.message));
```

### ESLint Configuration
- Frontend: React hooks rules + react-refresh
- Backend: TypeScript recommended rules
- Shared: TypeScript recommended rules

### Best Practices
- Run `pnpm typecheck` before committing
- Run `pnpm lint` to catch issues
- Build must pass before merging
- Use the shared package for types that are used in both frontend and backend

## TDD (Test-Driven Development) - Backend

### Test Stack
- **Vitest** - Test runner
- **Drizzle ORM** - Database ORM with migrations
- **PostgreSQL** - Test database (via Docker Compose)

### Test Structure
```
apps/backend/
├── src/
│   └── db/
│       ├── index.ts      # DB connection
│       └── schema.ts     # Drizzle schema
└── tests/
    ├── global-setup.ts   # Global test setup (loads env)
    ├── setup.ts          # Test setup/teardown
    ├── utils/
    │   └── db.ts         # Test DB utilities
    ├── unit/             # Unit tests (fast, isolated)
    │   └── *.test.ts
    └── integration/      # Integration tests (full HTTP/DB)
        └── *.test.ts
```

### Running Tests

#### Start Test Database
```bash
cd apps/backend
pnpm test:docker:up    # Start PostgreSQL container
pnpm db:push           # Push schema to test DB (first time or schema changes)
```

#### Run Tests
```bash
pnpm test              # Watch mode
pnpm test:run          # Single run
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests only
pnpm coverage          # With coverage report

pnpm test:docker:down  # Stop test database
```

### Writing Tests

#### Unit Tests
- Test individual functions in isolation
- No external dependencies (mock DB, HTTP, etc.)
- Fast execution (~ms)
- Location: `tests/unit/`

```ts
import { describe, it, expect } from 'vitest';

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

describe('validateEmail', () => {
  it('accepts valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });
});
```

#### Integration Tests
- Test full application flow with real DB
- Use Drizzle for database operations
- Location: `tests/integration/`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/db';
import { users } from '../../src/db/schema';
import { cleanDb, createTestUser } from '../utils/db';

describe('Users API', () => {
  beforeEach(async () => {
    await cleanDb();
  });

  it('creates a user', async () => {
    const user = await createTestUser({
      name: 'John',
      email: 'john@example.com',
    });
    expect(user.id).toBeDefined();
  });
});
```

### Database Migrations

```bash
# Generate migration from schema changes
pnpm db:generate

# Push schema to database
pnpm db:push

# Open Drizzle Studio
pnpm db:studio
```

### Environment Variables
- `.env.test` - Test database URL
- Test DB runs on port 5433 to avoid conflicts
