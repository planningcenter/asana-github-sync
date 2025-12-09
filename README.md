# Asana GitHub Sync

Hello world!

Goodbye!!

A GitHub Action that automatically synchronizes pull request states to Asana task custom fields. Keep your Asana tasks in sync with your PR lifecycle—no manual updates required.

## Problem

When PRs get approved or merged, the linked Asana tasks often remain stuck in "In Progress" or "In Review" states, requiring manual updates to keep project tracking accurate.

## Solution

This action listens to GitHub pull request events and automatically updates linked Asana tasks via the Asana API. GitHub becomes the source of truth for task status.

## Features

**Current Release:**
- ✅ Automatically updates Asana task status when PR is opened
- ✅ Automatically updates Asana task status when PR is merged
- ✅ Supports multiple Asana tasks per PR (updates all linked tasks)
- ✅ Optionally marks tasks as complete when PR is merged
- ✅ Extracts Asana task links from PR body (supports both short and long URL formats)
- ✅ Never fails your PR workflow—errors are logged but don't block merges
- ✅ Skips updates when PR body edited but Asana links unchanged
- ✅ Continues updating remaining tasks if one task update fails

**Limitations:**
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
| `tasks_updated` | Number of tasks successfully updated |
| `task_ids` | Comma-separated list of all task IDs found in PR |

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

## FAQ

### Will this automatically link my Asana Tasks and GitHub PRs in Asana?

This action **updates task status fields** but does not create the visual "app attachment" widgets that show PR details directly in Asana tasks.

**What this action does:**
- ✅ Updates the task's Status custom field (e.g., "In Review" → "Shipped")
- ✅ Marks tasks as complete when PRs are merged
- ✅ Keeps workflow state in sync automatically

**What this action does NOT do:**
- ❌ Create rich visual widgets/cards showing PR information in Asana
- ❌ Display PR status, reviewers, or checks in Asana UI

### Can I get both status updates AND visual widgets?

**Yes!** Use both actions together in your workflow:

```yaml
name: Asana Integration
on:
  pull_request:
    types: [opened, edited, closed]

jobs:
  asana-sync:
    runs-on: ubuntu-latest
    steps:
      # Create visual widget in Asana task
      - uses: Asana/create-app-attachment-github-action@latest
        with:
          asana-secret: ${{ secrets.ASANA_OAUTH_SECRET }}

      # Update task status field
      - uses: planningcenter/asana-github-sync@v1
        with:
          asana_token: ${{ secrets.ASANA_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          custom_field_gid: '1202887490284881'
```

**Setup requirements:**

1. **ASANA_TOKEN** (for asana-github-sync):
   - Generate at [Asana Developer Console](https://app.asana.com/0/my-apps)
   - This is a Personal Access Token (PAT)

2. **ASANA_OAUTH_SECRET** (for create-app-attachment):
   - Generate at [Asana GitHub Integration Platform](https://github.integrations.asana.plus/auth?domainId=ghactions)
   - This is an OAuth token specific to Asana's GitHub integration
   - Manage/revoke at [Token Management](https://github.integrations.asana.plus/auth?domainId=manage_tokens)

**Result:** Your Asana tasks will have both a rich visual PR widget AND automatically updated status fields.

### Error Handling Philosophy

**This action will never fail your PR workflow.** All errors are logged with `core.error()` or `core.warning()` but the action always succeeds. This ensures Asana issues never block code merges.

**Logged but not blocking:**
- Asana API failures (network, rate limits, auth)
- Invalid custom field GID
- Task not found
- Custom field state name not found

### Multiple Tasks

**The action now supports multiple Asana tasks per PR!**

If your PR body contains multiple Asana task links:
```markdown
## Related Tasks
https://app.asana.com/0/0/1211770387762076
https://app.asana.com/0/0/1211770387762077
https://app.asana.com/0/0/1211770387762078
```

All linked tasks will be updated with the same status transition. If one task update fails, the action will log an error and continue updating the remaining tasks. A summary of successes and failures is logged at the end.

## Known Limitations

The following features are planned for future releases:

1. **No draft support** - Draft PRs are ignored (draft → ready for review not tracked)
2. **No approval checking** - Future release will add "Ready" state when required approvals met
3. **No commenting** - Future release will comment on merged PRs without Asana links
4. **edited events** - Only processes edited events if Asana links changed

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
