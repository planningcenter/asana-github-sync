# Coding Standards

This document outlines the coding standards enforced in this project through ESLint and TypeScript configuration.

## Enforced Rules

### TypeScript Standards

#### 1. No `any` Types
**Rule:** `@typescript-eslint/no-explicit-any: error`

```typescript
// ❌ Bad
function process(data: any) { ... }

// ✅ Good
function process(data: unknown) { ... }
function process<T>(data: T) { ... }
```

#### 2. No Type Casting
**Rule:** `@typescript-eslint/consistent-type-assertions: ['error', { assertionStyle: 'never' }]`

```typescript
// ❌ Bad
const value = someValue as string;
const value = <string>someValue;

// ✅ Good - Use type guards
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

if (isString(value)) {
  // value is now typed as string
}
```

#### 3. Type-Only Imports
**Rule:** `@typescript-eslint/consistent-type-imports: error`

```typescript
// ❌ Bad
import { SomeType, SomeInterface } from './types';

// ✅ Good
import type { SomeType, SomeInterface } from './types';
```

#### 4. Always Use Semicolons
**Rule:** `semi: ['error', 'always']`

```typescript
// ❌ Bad
const value = 123
function doSomething() { }

// ✅ Good
const value = 123;
function doSomething() { }
```

### TypeScript Compiler Options

#### Strict Type Checking
```json
{
  "noImplicitAny": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "strictBindCallApply": true,
  "noImplicitThis": true,
  "noUncheckedIndexedAccess": true
}
```

## Best Practices (Not Enforced)

### Type Inference
Leverage TypeScript's type inference whenever possible:

```typescript
// ✅ Good - let TypeScript infer
const tasks = [
  { id: 1, title: "Review PR" },
  { id: 2, title: "Update docs" },
];
const firstTask = tasks[0]; // Type is inferred
```

### Interfaces vs Types
- **Prefer `interface`** for object shapes
- **Use `type`** for unions, intersections, and aliases

```typescript
// ✅ Good - use interfaces for objects
interface TaskProps {
  task: Task;
  onComplete: (id: string) => void;
}

// ✅ Good - use type for unions
type TaskStatus = "pending" | "completed" | "failed";
```

### Props Definitions
- **Inline** for simple props (2-3 properties)
- **Separate interface** for complex props

```typescript
// ✅ Good - inline for simple props
export function TaskItem({ task, onComplete }: {
  task: Task;
  onComplete: (id: string) => void;
}) { ... }

// ✅ Good - separate interface for complex props
interface TaskListProps {
  tasks: Task[];
  onTaskComplete: (id: string) => void;
  onTaskDelete: (id: string) => void;
  filter?: TaskFilter;
}
```

### Control Flow
Prefer `if/else` blocks over early returns where it improves readability (not currently enforced by linter).

## Running Linters

```bash
# Check for linting errors
bun run lint

# Auto-fix linting errors
bun run lint:fix

# Run TypeScript compiler
bun run build
```

## IDE Integration

Most modern IDEs (VS Code, WebStorm, etc.) will automatically show these errors and warnings in real-time when editing TypeScript files.
