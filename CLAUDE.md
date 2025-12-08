# Asana-GitHub Sync Action

## Project Overview

A GitHub Action that automatically synchronizes pull request states to Asana task custom fields, using GitHub as the source of truth. This eliminates manual status updates and keeps Asana tasks in sync with PR lifecycle.

**Problem:** PRs get approved/merged but Asana tasks stay in "In Review" or "In Progress", requiring manual updates.

**Solution:** GitHub Action that listens to PR events and automatically updates linked Asana tasks via API.

## Key Links

- **Asana Project:** https://app.asana.com/1/1202585680506197/project/1212291850390910/list
- **Implementation Plan:** /Users/jt/.claude/plans/frolicking-cuddling-pelican.md
- **PRD:** See README.md in this repo (once created)

## Architecture Decisions

### Action Type
**JavaScript Action** (`using: node20` in action.yml)
- Better for API-heavy operations than composite action
- Direct TypeScript execution with @vercel/ncc bundling
- Simpler error handling and dependency management

### Asana Status Implementation
**Custom Fields with Enum Options** (not sections)
- Status is a custom field with dropdown values
- Must fetch custom field, find enum option by name, get GID, then update task
- API flow: GET custom field → find enum option → PUT task with option GID

### State Names
**Standardized across all teams**
- Default states: "In Progress", "Ready for Review", "Ready", "Done"
- Configurable via action inputs but same names used org-wide

### Error Handling Philosophy
**Never fail the PR workflow**
- All errors caught and logged with `core.error()` and `core.warning()`
- NEVER call `core.setFailed()` - Asana issues must not block merges
- Retry transient errors (429, 500) with exponential backoff
- Fail open on API errors (assume success if verification fails)

### Retry Logic
**3 attempts with exponential backoff**
- Uses @lifeomic/attempt library
- Initial delay: 1s, factor: 2x
- Retries: API rate limits (429), server errors (500), network timeouts
- No retry: permanent errors (404, 400, 401)

## Implementation Approach

### MVP First (Milestone 1)
Deliver basic functionality quickly:
- PR opened → "Ready for Review"
- PR merged → "Done"
- Single task only (ignore multiple links)
- No draft handling
- No approval checking
- No comment posting

### Full Lifecycle (Milestone 2)
Complete PR workflow:
- Draft handling (draft ↔ ready for review)
- Approval checking with required reviewers
- Branch protection rule verification

### Production Polish (Milestone 3)
Final features:
- Comment posting on merged PRs without Asana links
- Multiple task handling
- Comprehensive docs and testing

## Project Structure

```
/Users/jt/Code/asana-github-sync/
├── src/
│   ├── index.ts              # Entry point - orchestrates sync
│   ├── config.ts             # Read/validate action inputs
│   ├── parser.ts             # Extract Asana task IDs from PR body
│   ├── asana.ts              # Asana API integration with retry
│   ├── github.ts             # GitHub API (approvals, comments)
│   ├── types.ts              # TypeScript interfaces
│   ├── logger.ts             # Structured logging
│   └── utils/
│       └── retry.ts          # Exponential backoff wrapper
├── __tests__/                # Jest unit tests
├── dist/
│   └── index.js              # Bundled output (committed to git)
├── action.yml                # Action metadata
├── package.json
├── tsconfig.json
└── README.md
```

## Event → State Mapping

| GitHub Event | Condition | Asana State | Milestone |
|--------------|-----------|-------------|-----------|
| `pull_request.opened` | Not draft | `state_on_opened` (Ready for Review) | MVP |
| `pull_request.closed` | Merged | `state_on_merged` (Done) | MVP |
| `pull_request.opened` | Is draft | `state_on_draft` (In Progress) | M2 |
| `pull_request.converted_to_draft` | - | `state_on_draft` | M2 |
| `pull_request.ready_for_review` | - | `state_on_opened` | M2 |
| `pull_request_review.submitted` | Approved + requirements met | `state_on_approved` (Ready) | M2 |

## Critical Implementation Details

### Asana API Update Flow
1. Fetch custom field: `GET /custom_fields/{custom_field_gid}`
2. Find enum option in `enum_options` array where `name` matches status name
3. Extract `gid` from matching enum option
4. Update task: `PUT /tasks/{task_gid}` with `custom_fields: { "field_gid": "option_gid" }`

### Draft PR Detection
Check `payload.pull_request.draft` boolean, NOT the action field:
```typescript
if (action === 'opened') {
  const state = pr.draft ? config.stateOnDraft : config.stateOnOpened;
}
```

### Approval Requirements
When `check_required_reviewers` is true:
1. Get PR reviews: filter for `state === 'APPROVED'`
2. Get branch protection rules for base branch
3. Extract `required_approving_review_count` (default 1)
4. Compare approval count with required count

### Parser Regex
Extract Asana task IDs from PR body:
```typescript
const pattern = /https:\/\/app\.asana\.com\/0\/\d+\/(\d+)/g;
```

## Technology Stack

**Runtime:** Node.js 20
**Language:** TypeScript (ES2022, strict mode)
**Bundler:** @vercel/ncc (single file output)
**Testing:** Jest with ts-jest

**Key Dependencies:**
- `@actions/core` - GitHub Actions toolkit
- `@actions/github` - GitHub API client
- `asana` - Official Asana SDK
- `@lifeomic/attempt` - Retry with exponential backoff

## Configuration Inputs

**Required:**
- `asana_token` - Asana Personal Access Token
- `github_token` - GitHub token (auto-provided)
- `custom_field_gid` - GID of Asana status custom field

**Optional (with defaults):**
- `state_on_opened`: "Ready for Review"
- `state_on_draft`: "In Progress"
- `state_on_approved`: "Ready"
- `state_on_merged`: "Done"
- `check_required_reviewers`: true
- `transition_multiple_tasks`: true
- `comment_if_no_task`: true

## Current Status

**Phase:** Planning and initial setup
**Current Milestone:** Milestone 1 (MVP)
**Next Task:** Project initialization (1212346866291904)

See Asana project for detailed task breakdown and dependencies.

## Success Criteria

- No manual Asana status updates required for standard PR workflow
- Tasks accurately reflect PR state within 1 minute of events
- Zero impact on PR merge process if Asana API unavailable
- Easy for new teams to adopt (< 5 minutes to configure)
- Unit test coverage ≥80%

## Development Workflow

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint and format
npm run lint
npm run format

# Build TypeScript
npm run build

# Package for distribution
npm run package

# Run all checks
npm run all
```

## Testing Strategy

**Unit Tests:**
- Parser: regex extraction, edge cases (null, duplicates, malformed)
- Asana: mock client, enum lookup, retry logic, batch updates
- GitHub: mock Octokit, approval checking, comment posting
- Coverage target: 80%

**Manual E2E Testing:**
- Create test repo with workflow
- Test all PR event types
- Verify Asana state transitions
- Validate error handling
- Test with real Asana API

## Important Notes

1. **Never fail PR workflows** - Use `core.error()`, not `core.setFailed()`
2. **Commit dist/index.js** - GitHub Actions requires compiled output
3. **MVP scope** - Start simple, iterate based on feedback
4. **GitHub is source of truth** - Automation always overwrites manual Asana changes
5. **Custom field GID required** - Users must find this in Asana before setup
