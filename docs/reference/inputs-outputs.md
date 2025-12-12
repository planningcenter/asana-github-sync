# Inputs and Outputs

GitHub Action inputs and outputs reference.

## Inputs

Configuration parameters for the action.

### asana_token

**Required:** Yes
**Type:** String
**Description:** Asana Personal Access Token for API authentication.

**Usage:**
```yaml
- uses: planningcenter/asana-github-sync@main
  with:
    asana_token: ${{ secrets.ASANA_TOKEN }}
```

**How to get:**
1. Go to [Asana Developer Console](https://app.asana.com/0/my-apps)
2. Create a Personal Access Token
3. Add to GitHub Secrets as `ASANA_TOKEN`

**Security:**
- Never commit tokens to repository
- Always use GitHub Secrets
- Token has same permissions as your Asana account

### github_token

**Required:** Yes
**Type:** String
**Description:** GitHub token for accessing PR data and posting comments.

**Usage:**
```yaml
- uses: planningcenter/asana-github-sync@main
  with:
    github_token: ${{ github.token }}
```

**Default token:**
```yaml
github_token: ${{ github.token }}
```

This automatically-provided token has permissions for:
- Reading PR data
- Posting PR comments
- Accessing PR comments

**Custom token:**
If you need additional permissions, create a PAT:
```yaml
github_token: ${{ secrets.CUSTOM_GITHUB_TOKEN }}
```

### rules

**Required:** Yes
**Type:** YAML string
**Description:** Rules configuration defining automation behavior.

**Usage:**
```yaml
- uses: planningcenter/asana-github-sync@main
  with:
    rules: |
      rules:
        - when:
            event: pull_request
            action: opened
          then:
            update_fields:
              '1234567890': 'In Review'
```

**Structure:**
- Must contain `rules:` array
- Each rule has `when:` and `then:` blocks
- Validated before execution

**See:**
- [Your First Rule](/guide/your-first-rule) - Tutorial
- [Rules Overview](/concepts/rules-overview) - Architecture
- [Validation Rules](/reference/validation-rules) - All rules

### user_mappings

**Required:** No
**Type:** YAML string (mapping object)
**Description:** Map GitHub usernames to Asana user GIDs for automatic assignment.

**Usage:**
```yaml
- uses: planningcenter/asana-github-sync@main
  with:
    user_mappings: |
      octocat: 1234567890
      dependabot[bot]: 0987654321
      renovate[bot]: 1111111111
```

**Format:**
```yaml
github_username: asana_user_gid
```

**When to use:**
- Assigning tasks to PR authors
- Mapping bot accounts to team members
- Routing work based on contributors

**See:**
- [map_github_to_asana](/reference/helpers/user-mapping) - Using mappings

### integration_secret

**Required:** No
**Type:** String
**Description:** Asana-GitHub integration secret for rich PR attachments.

**Usage:**
```yaml
- uses: planningcenter/asana-github-sync@main
  with:
    integration_secret: ${{ secrets.ASANA_GITHUB_INTEGRATION_SECRET }}
```

**When needed:**
Only if you have the [Asana GitHub integration](https://asana.com/apps/github) installed and want rich PR widgets in Asana.

**Without integration_secret:**
- Task gets a simple text link to the PR
- No automatic updates when PR state changes
- Still fully functional for field updates

**With integration_secret:**
- Tasks show a rich PR widget with:
  - PR status badge (open/merged/closed)
  - CI check statuses (passing/failing)
  - Review status and reviewers
  - Direct link to PR
- Widget updates automatically when PR changes
- Better team visibility from within Asana

::: tip Optional but Recommended
The integration secret is completely optional. The action works fine without it—you just won't get the fancy PR widgets in Asana. If you're setting this up for the first time, you can skip it and add it later.
:::

**How to get:**
1. Go to https://github.integrations.asana.plus/auth?domainId=ghactions
2. Authorize both Asana and GitHub apps
3. Copy the generated secret
4. Add to GitHub Secrets as `ASANA_GITHUB_INTEGRATION_SECRET`

**See:**
- [Installation Guide](/guide/installation#step-2-get-asana-github-integration-secret) - Detailed setup

### dry_run

**Required:** No
**Type:** Boolean (string)
**Default:** `false`
**Description:** Enable dry-run mode to preview what the action would do without making any changes.

**Usage:**
```yaml
- uses: planningcenter/asana-github-sync@main
  with:
    dry_run: true
```

**When enabled:**
- No changes are made to Asana (no task updates, no task creation)
- No changes are made to GitHub (no PR comments, no PR body updates)
- All actions that *would* be taken are logged with `[DRY RUN]` prefix
- Perfect for testing your configuration before going live

**What gets logged:**
```
🔍 DRY RUN MODE ENABLED - No changes will be made
[DRY RUN] Would update task 1234567890:
[DRY RUN]   - Field 1202887490284881: In Review
[DRY RUN] Would create task: "Fix authentication bug"
[DRY RUN]   - Project: 1234567890
[DRY RUN]   - Workspace: 9876543210
[DRY RUN] Would post comment to PR #123
```

**Common use cases:**
- **Testing new rules** before applying them to real tasks
- **Validating field GIDs** to ensure they match your Asana project
- **Migration testing** when moving from manual updates to automation
- **Debugging** rule conditions that aren't matching as expected

::: tip Migration Made Easy
When setting up the action for the first time, enable `dry_run: true` and trigger the workflow with a test PR. Review the logs to see exactly what would happen, then disable dry-run once you're confident the configuration is correct.
:::

**Example workflow for testing:**
```yaml
name: Asana Sync (Test)
on:
  pull_request:
    types: [opened]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: planningcenter/asana-github-sync@main
        with:
          asana_token: ${{ secrets.ASANA_TOKEN }}
          github_token: ${{ github.token }}
          dry_run: true  # ← Test mode enabled
          rules: |
            rules:
              - when:
                  event: pull_request
                  action: opened
                then:
                  update_fields:
                    '1234567890': 'In Review'
```

**See:**
- [Installation Guide](/guide/installation#step-6-test-it) - Testing setup

## Outputs

Values exported after action execution.

### task_ids

**Type:** String (comma-separated)
**Description:** List of Asana task GIDs that were found in the PR or created.

**Example:**
```
1234567890,0987654321,1111111111
```

**When populated:**
- Tasks found in PR description (from Asana URLs)
- Tasks created by `create_task` action

**Usage:**
```yaml
- uses: planningcenter/asana-github-sync@main
  id: asana
  with:
    # inputs...

- name: Use task IDs
  run: echo "Tasks: ${{ steps.asana.outputs.task_ids }}"
```

**Parsing:**
```yaml
- name: Process each task
  run: |
    IFS=',' read -ra TASKS <<< "${{ steps.asana.outputs.task_ids }}"
    for task in "${TASKS[@]}"; do
      echo "Task: $task"
    done
```

### field_updates

**Type:** String (number)
**Description:** Count of field updates that were applied.

**Example:**
```
5
```

**Counts:**
- Each field update in `update_fields`
- Across all tasks
- Only successful updates

**Usage:**
```yaml
- name: Check updates
  run: |
    if [ "${{ steps.asana.outputs.field_updates }}" -gt "0" ]; then
      echo "Fields were updated"
    fi
```

### tasks_created

**Type:** String (number)
**Description:** Number of tasks created by `create_task` actions.

**Example:**
```
1
```

**Counts:**
- Tasks created via `create_task`
- Only successful creations

**Usage:**
```yaml
- name: Check if task created
  run: |
    if [ "${{ steps.asana.outputs.tasks_created }}" -eq "1" ]; then
      echo "New task was created"
    fi
```

## Complete Example

```yaml
name: Asana Sync
on:
  pull_request:
    types: [opened, closed]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: planningcenter/asana-github-sync@main
        id: asana
        with:
          # Required inputs
          asana_token: ${{ secrets.ASANA_TOKEN }}
          github_token: ${{ github.token }}
          rules: |
            rules:
              - when:
                  event: pull_request
                  action: opened
                then:
                  update_fields:
                    '1234567890': 'In Review'

          # Optional inputs
          user_mappings: |
            octocat: 1234567890
            dependabot[bot]: 0987654321

          integration_secret: ${{ secrets.ASANA_GITHUB_INTEGRATION_SECRET }}

      # Use outputs
      - name: Summary
        run: |
          echo "Tasks: ${{ steps.asana.outputs.task_ids }}"
          echo "Updates: ${{ steps.asana.outputs.field_updates }}"
          echo "Created: ${{ steps.asana.outputs.tasks_created }}"
```

## Input Validation

### Required Inputs

If required inputs are missing, the action fails immediately:

```
Error: Input required and not supplied: asana_token
```

### Optional Inputs

Optional inputs can be omitted:

```yaml
# Minimal configuration
- uses: planningcenter/asana-github-sync@main
  with:
    asana_token: ${{ secrets.ASANA_TOKEN }}
    github_token: ${{ github.token }}
    rules: |
      # Your rules
```

### Rules Validation

The `rules` input is validated before execution. See [Validation Rules](/reference/validation-rules) for all checks.

## Environment Variables

The action doesn't use environment variables directly. All configuration is via inputs.

## Secrets Management

### Recommended Secrets

Store these as GitHub Secrets:

1. **ASANA_TOKEN** (required)
   - Asana Personal Access Token
   - Settings → Secrets and variables → Actions → New secret

2. **ASANA_GITHUB_INTEGRATION_SECRET** (optional)
   - Only if using Asana-GitHub integration
   - Same location as ASANA_TOKEN

### Don't Create Secrets For

- `github_token` - Use `$\{\{ github.token \}\}`
- `user_mappings` - Can be in workflow YAML (GIDs aren't sensitive)
- `rules` - Configuration, not credentials

## Troubleshooting

### "Input required" Error

```
Error: Input required and not supplied: asana_token
```

**Fix:** Add the input:
```yaml
with:
  asana_token: ${{ secrets.ASANA_TOKEN }}
```

### "Invalid rules YAML" Error

```
Error: rules must be an array
```

**Fix:** Check YAML formatting:
```yaml
rules: |
  rules:  # Don't forget this top level!
    - when:
        # ...
```

### GitHub Token Permissions

If posting comments fails:

**Fix:** Ensure token has permissions:
```yaml
permissions:
  pull-requests: write  # For posting comments
  contents: read        # For reading PR data
```

## See Also

- [Installation Guide](/guide/installation) - Step-by-step setup
- [Your First Rule](/guide/your-first-rule) - Quick start
- [Validation Rules](/reference/validation-rules) - Configuration validation
- [GitHub Actions Docs](https://docs.github.com/en/actions/learn-github-actions/contexts#inputs-context) - Inputs context
