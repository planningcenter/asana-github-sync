# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

GitHub Action (TypeScript/Bun) that syncs GitHub pull requests to Asana tasks via rule-based automation. Entry point: `src/index.ts`. Built output in `dist/` is committed and used directly by the action runtime.

## Essential Commands

- `bun test` - Run tests
- `bun test --watch` - Watch mode
- `bun run package` - Bundle to dist/index.js (esbuild)
- `bun run build` - Type-check only (tsc)
- `bun run lint` - Lint
- `bun run lint:fix` - Lint with fixes
- `bun run format` - Format (prettier)
- `bun run all` - Format, lint, test, package

## Project Structure

```
src/
  index.ts              Action entry point
  types.ts              Shared types
  rules/                Rule engine
    engine.ts           Evaluates rules against PR events
    validator.ts        Validates rule config
    types.ts
  expression/           Condition expression evaluation
    evaluator.ts
    context.ts          PR context builder
    helpers.ts
  util/
    asana/              Asana API client
      client.ts
      create.ts         Task creation
      update.ts         Field updates
      tasks.ts          Task lookup
      fields.ts         Custom field resolution
    config.ts           Action input parsing
    github.ts           GitHub API helpers
    parser.ts           YAML rules parser
    retry.ts            Retry logic
    template-analysis.ts  Handlebars template utilities
__tests__/              Tests mirror src/ structure
  rules/
  util/
  integration/
dist/                   Bundled output — commit after packaging
docs/                   VitePress user-facing documentation
```

## User-Facing Documentation

The `docs/` directory contains VitePress documentation for action users. Read these before implementing or modifying features:

- `docs/concepts/` - Rules, conditions, actions, templates (domain model)
- `docs/reference/` - All conditions, actions, context variables, validation rules
- `docs/examples/` - Real-world workflows that illustrate expected behavior

## Development Practices

- Run `bun run all` before committing to ensure formatting, lint, tests, and packaging are all clean.
- `dist/index.js` must be committed — the action references it directly, not a build step.
- The action never throws or fails CI. All errors are caught and logged; workflows always continue.
- `dry_run` mode must be respected throughout — check `src/util/config.ts` for the flag.
- Tests use Bun's built-in test runner with msw for HTTP mocking. See `__tests__/setup.ts` for test setup.
- Do not review or edit files in `dist/`.
