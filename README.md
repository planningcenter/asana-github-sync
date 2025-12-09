# Asana GitHub Sync

A GitHub Action that automatically synchronizes pull request states to Asana task custom fields. Keep your Asana tasks in sync with your PR lifecycle—no manual updates required.

## Problem

When PRs get approved or merged, the linked Asana tasks often remain stuck in "In Progress" or "In Review" states, requiring manual updates to keep project tracking accurate.

## Solution

This action listens to GitHub pull request events and automatically updates linked Asana tasks via the Asana API. GitHub becomes the source of truth for task status.

## Features

**MVP (Current Release):**
- ✅ Automatically updates Asana task status when PR is opened
- ✅ Automatically updates Asana task status when PR is merged
- ✅ Optionally marks tasks as complete when PR is merged
- ✅ Extracts Asana task links from PR body (supports both short and long URL formats)
- ✅ Never fails your PR workflow—errors are logged but don't block merges
- ✅ Skips updates when PR body edited but Asana links unchanged

**MVP Limitations:**
- ⚠️ Single task per PR only (multiple tasks will be skipped with a warning)
- ⚠️ Draft PRs are skipped (draft mode not supported yet)
- ⚠️ No comment posting when Asana tasks are missing
- ⚠️ No approval checking for "Ready" state

## Usage

### Basic Setup

Add this action to your workflow file (e.g., `.github/workflows/asana-sync.yml`):

```yaml
name: Asana Sync
on:
  pull_request:
    types: [opened, edited, closed]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: planningcenter/asana-github-sync@v1
        with:
          asana_token: ${{ secrets.ASANA_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          custom_field_gid: '1202887490284881'  # Your Status field GID
```

### Complete Example with Custom States

```yaml
name: Asana Sync
on:
  pull_request:
    types: [opened, edited, closed]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: planningcenter/asana-github-sync@v1
        with:
          asana_token: ${{ secrets.ASANA_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          custom_field_gid: '1202887490284881'
          state_on_opened: 'In Review'
          state_on_merged: 'Shipped'
          mark_complete_on_merge: true
```

## Configuration

### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `asana_token` | **Yes** | - | Asana Personal Access Token ([generate here](https://app.asana.com/0/my-apps)) |
| `github_token` | **Yes** | - | GitHub token (use `${{ secrets.GITHUB_TOKEN }}`) |
| `custom_field_gid` | **Yes** | - | GID of the Asana Status custom field to update |
| `state_on_opened` | No | `In Review` | State to set when PR is opened |
| `state_on_merged` | No | `Shipped` | State to set when PR is merged |
| `mark_complete_on_merge` | No | `true` | Mark the Asana task as completed when PR is merged |

### Outputs

| Output | Description |
|--------|-------------|
| `tasks_updated` | Number of tasks updated (0 or 1 in MVP) |
| `task_ids` | Comma-separated list of updated task IDs |

### Finding Your Custom Field GID

1. Open your Asana project in a web browser
2. Click on any task and look at the Status dropdown
3. Right-click the Status field → "Inspect Element"
4. Search for `custom_field_gid` in the HTML/network requests
5. Copy the numeric GID (e.g., `1202887490284881`)

Alternatively, use the [Asana API Explorer](https://developers.asana.com/docs/api-explorer) to query your project's custom fields.

## How It Works

### Event → State Mapping

| GitHub Event | Asana State | Marked Complete? |
|--------------|-------------|------------------|
| `pull_request.opened` | `state_on_opened` (default: In Review) | No |
| `pull_request.edited`* | `state_on_opened` (default: In Review) | No |
| `pull_request.closed` (merged) | `state_on_merged` (default: Shipped) | Yes (if enabled) |

\* Only updates if Asana task links changed in the PR body

### Asana Task Link Detection

The action scans your PR body for Asana task URLs. Both formats are supported:

**Short format:**
```
https://app.asana.com/0/0/1211770387762076
```

**Long format:**
```
https://app.asana.com/1/1202585680506197/project/1207308952015558/task/1210723244258078
```

**Example PR body:**
```markdown
## Changes
- Fixed authentication bug
- Updated error handling

## Asana Task
https://app.asana.com/0/0/1211770387762076
```

### Error Handling Philosophy

**This action will never fail your PR workflow.** All errors are logged with `core.error()` or `core.warning()` but the action always succeeds. This ensures Asana issues never block code merges.

**Logged but not blocking:**
- Asana API failures (network, rate limits, auth)
- Invalid custom field GID
- Task not found
- Custom field state name not found

## Limitations (MVP)

This is the MVP release focused on core functionality. The following limitations will be addressed in future releases:

1. **Single task only** - PRs with multiple Asana links will be skipped
2. **No draft support** - Draft PRs are ignored (draft → ready for review not tracked)
3. **No approval checking** - Future release will add "Ready" state when required approvals met
4. **No commenting** - Future release will comment on merged PRs without Asana links
5. **edited events** - Only processes edited events if Asana links changed

## Development

### Prerequisites

- Node.js 20+
- Bun (for faster dependency management)

### Setup

```bash
# Clone the repository
git clone https://github.com/planningcenter/asana-github-sync.git
cd asana-github-sync

# Install dependencies
bun install
# or
npm install

# Run tests
npm test

# Build the action
npm run build

# Package for distribution (bundles to dist/index.js)
npm run package
```

### Project Structure

```
src/
├── index.ts              # Entry point - orchestrates sync
├── types.ts              # TypeScript interfaces and enums
├── util/
│   ├── config.ts         # Read/validate action inputs
│   ├── parser.ts         # Extract Asana task IDs from PR body
│   ├── asana.ts          # Asana API integration
│   ├── transition.ts     # State transition logic
│   └── validation.ts     # PR/task validation
__tests__/                # Jest unit tests
dist/index.js             # Bundled output (committed for GitHub Actions)
action.yml                # Action metadata
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## Roadmap

### Milestone 2: Full PR Lifecycle
- Draft PR handling (draft ↔ ready for review transitions)
- Approval checking with required reviewers
- "Ready" state when approvals met

### Milestone 3: Production Polish
- Multiple task support
- Comment posting on merged PRs without Asana links
- Comprehensive documentation and examples

## Security

**Never commit your Asana token.** Always use GitHub Secrets:

1. Go to your repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `ASANA_TOKEN`
4. Value: Your Asana Personal Access Token
5. Click "Add secret"

## Support

- **Issues:** [GitHub Issues](https://github.com/planningcenter/asana-github-sync/issues)
- **Asana Project:** [Planning Center Development](https://app.asana.com/1/1202585680506197/project/1212291850390910/list)

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions welcome! Please read CONTRIBUTING.md for guidelines.

---

**Made with ❤️ by Planning Center**
