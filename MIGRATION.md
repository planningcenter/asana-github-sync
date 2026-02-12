# Migration from Old GitHub Actions

## Workflow 1: Build Created Label

### Old Workflow

https://github.com/planningcenter/services-ios/blob/main/.github/workflows/update-asana-task.yml

### New Workflow

```yaml
name: Update Asana Task

on:
  pull_request:
    types:
      - labeled

jobs:
  update-asana-task:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write  # For posting comments
      contents: read        # For reading PR data
    steps:
      - name: Sync PR to Asana
        uses: planningcenter/asana-github-sync@main
        with:
          asana_token: ${{ secrets.ASANA_PERSONAL_ACCESS_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          rules: |
            rules:
              - when:
                  event: pull_request
                  action: labeled
                  label: build_created
                then:
                  update_fields:
                    # QA Status → "QA Requested"
                    '1202880331736132': '1202888299403896'
                    # Build Type → "Test"
                    '1203158031514948': '1203211562684746'
                    # Status → "In Review"
                    '1202887490284881': '1202887490288021'
                    # Test Version # → extracted from comments
                    '1210535494227756': '{{extract_from_comments "Build completed with Version (.+)"}} (firebase)'
                  post_pr_comment: |
                    ✅ Updated {{summary.total}} Asana task{{#unless (eq summary.total 1)}}s{{/unless}} with build information

                    **Tasks Updated:**
                    {{#each tasks}}• {{name}}
                    {{/each}}

                    **Asana Fields Updated:**
                    • Status: In Review
                    • QA: QA Requested
                    • Build Type: Test
                    • Test Version #: {{extract_from_comments "Build completed with Version (.+)"}}
```

## Workflow 2: PR Description Change

### Old Workflows

- https://github.com/planningcenter/ChurchCenterApp/blob/main/.github/workflows/description_change.yml (reusable)
- https://github.com/planningcenter/ChurchCenterApp/blob/main/.github/workflows/update_asana_custom_field.yml

### New Workflow

```yaml
name: PR Description Change Workflow

on:
  pull_request:
    types:
      - edited

jobs:
  update-asana-field:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write  # For posting comments
      contents: read        # For reading PR data
    steps:
      - name: Sync PR to Asana
        uses: planningcenter/asana-github-sync@main
        with:
          asana_token: ${{ secrets.ASANA_PERSONAL_ACCESS_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          rules: |
            rules:
              - when:
                  event: pull_request
                  action: edited
                then:
                  update_fields:
                    # Build Number field
                    '1203119596857860': '{{extract_from_comments "Build number:\\s*(\\d+)\\s+has been successfully created."}}'
                  post_pr_comment: |
                    {{#if (extract_from_comments "Build number:\\s*(\\d+)\\s+has been successfully created.")}}
                    ✅ Updated Asana task with build information

                    Asana Fields Updated:
                     Name: {{#each tasks}}{{name}}{{/each}}
                    • Build Number: ({{extract_from_comments "Build number:\\s*(\\d+)\\s+has been successfully created."}})
                    {{/if}}
```

## Workflow 3: Create Task for Specific PR Authors

### Old Workflow

https://github.com/planningcenter/gh-action-pr-to-asana/blob/main/src/action.js

This workflow creates an Asana task when a PR is opened, but only for specific PR authors. It:
- Filters by allowed PR authors
- Creates a task with the PR title (with conventional commit prefix removed) and PR number
- Places the task in a specific section
- Adds a story/comment to the Asana task with the PR link
- Removes the integration user as a follower
- Updates the PR description with the Asana task link

### New Workflow

```yaml
name: Create Asana Task for PR

on:
  pull_request:
    types:
      - opened

jobs:
  create-asana-task:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write  # For posting comments
      contents: read        # For reading PR data
    steps:
      - name: Sync PR to Asana
        uses: planningcenter/asana-github-sync@main
        with:
          asana_token: ${{ secrets.ASANA_PERSONAL_ACCESS_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          integration_secret: ${{ secrets.ASANA_GITHUB_INTEGRATION_SECRET }}
          rules: |
            rules:
              # Only create tasks for specific PR authors
              - when:
                  event: pull_request
                  action: opened
                  has_asana_tasks: false
                  # Filter by PR author - only these authors trigger task creation
                  author:
                    - dependabot[bot]
                    - renovate[bot]
                    - github-actions[bot]
                then:
                  create_task:
                    project: '1234567890123456'      # Replace with your project GID
                    workspace: '1234567890123456'    # Replace with your workspace GID
                    section: '1234567890123456'      # Replace with your section GID
                    # Title includes cleaned PR title + PR number
                    title: '{{clean_title pr.title}} #{{pr.number}}'
                    # HTML notes with PR link
                    html_notes: |
                      <body>
                      <strong>PR:</strong> <a href="{{pr.url}}">{{pr.title}}</a>
                      <hr />
                      {{sanitize_markdown pr.body}}
                      </body>
```

### Key Differences

**Old workflow:**
- Used `asana_tasks_for_pr_authors` input to filter by author
- Used plain title splitting logic: `prTitle.includes(":") ? prTitle.split(":")[1].trim() : prTitle.trim()`
- Added story/comment to Asana task with PR link (simple text, not rich attachment)
- Manually updated PR description with specific format

**New workflow:**
- Uses `author` condition (can be string or array) to filter by author in rules
- Uses `{{clean_title pr.title}}` helper which removes conventional commit prefixes
- Uses `integration_secret` for rich PR attachment (if provided) - no need for manual story creation
- Automatically appends Asana task link to PR description
- Always removes integration user ('me') as follower (no configuration needed)

### Migration Notes

1. **Find your GIDs:** You'll need your project, workspace, and section GIDs from Asana
2. **Author list:** Replace the example authors (`dependabot[bot]`, etc.) with your actual list from the old `asana_tasks_for_pr_authors` input
3. **Integration secret (optional):** If you want rich PR attachments in Asana (showing PR status, checks, etc.), add `integration_secret` input. Otherwise, omit it.
4. **Title format:** The new workflow uses `#{{pr.number}}` to match the old format. The `clean_title` helper automatically removes conventional commit prefixes like "feat:", "fix:", etc.

## Workflow 4: Create Task with User Mapping and Integration

### Old Workflow

https://github.com/planningcenter/gh-action-create-asana-task/blob/main/src/index.js

This workflow creates an Asana task when a PR is opened (if not already linked). It:
- Checks if PR already has an Asana task link (skips if found)
- Maps GitHub user to Asana user via `asana-users` JSON input
- Creates task with cleaned title and sanitized PR body
- Assigns task based on PR assignee or author
- Updates PR description with Asana task link
- Attaches PR to Asana via integration for rich formatting
- Always removes integration user as follower

### New Workflow

```yaml
name: Create Asana Task for PR

on:
  pull_request:
    types:
      - opened

jobs:
  create-asana-task:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write  # For posting comments
      contents: read        # For reading PR data
    steps:
      - name: Sync PR to Asana
        uses: planningcenter/asana-github-sync@main
        with:
          asana_token: ${{ secrets.ASANA_PERSONAL_ACCESS_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          integration_secret: ${{ secrets.ASANA_GITHUB_INTEGRATION_SECRET }}
          # Map GitHub usernames to Asana user GIDs
          user_mappings: |
            octocat: '1234567890123456'
            dependabot[bot]: '1234567890123457'
          rules: |
            rules:
              - when:
                  event: pull_request
                  action: opened
                  has_asana_tasks: false
                then:
                  create_task:
                    project: '1234567890123456'      # Replace with your project GID
                    workspace: '1234567890123456'    # Replace with your workspace GID
                    title: '{{clean_title pr.title}}'
                    html_notes: |
                      <body>
                      <strong>Created from GitHub PR:</strong> <a href="{{pr.url}}">{{pr.url}}</a>
                      <hr />
                      {{sanitize_markdown pr.body}}
                      </body>
                    # Assign to PR assignee if set, otherwise PR author
                    assignee: '{{lookup_user (or pr.assignee pr.author)}}'
```

### Key Differences

**Old workflow:**
- Used `asana-users` input with JSON mapping: `{"github_user": "asana_gid"}`
- Checked PR assignee first, then fell back to PR author: `pr.assignee?.login || pr.user?.login`
- Used `stripHtmlContent()` function to sanitize PR body
- Manually removed integration user as follower
- Required `asana-pat`, `asana-project-id`, `asana-workspace-id`, and `asana-github-integration-secret` inputs

**New workflow:**
- Uses `user_mappings` as a top-level `with` input (YAML format)
- Uses `{{lookup_user pr.author}}` helper for assignee mapping
- Uses built-in `{{sanitize_markdown pr.body}}` helper
- Automatically removes integration user as follower (no configuration needed)
- Only requires `asana_token`, `github_token`, and optional `integration_secret` inputs

### Migration Notes

1. **User mappings:** Convert your old JSON to YAML format:
   ```yaml
   user_mappings: |
     octocat: '1234567890123456'
     dependabot[bot]: '1234567890123457'
   ```

2. **Assignee logic:** The old workflow checked `pr.assignee` first, then fell back to `pr.user`. The new workflow exposes both `pr.assignee` and `pr.author`. To match the old behavior:
   ```yaml
   # Assign to PR assignee if set, otherwise assign to PR author
   assignee: '{{lookup_user (or pr.assignee pr.author)}}'
   ```

   Or use just one:
   ```yaml
   assignee: '{{lookup_user pr.author}}'     # Always assign to PR author
   assignee: '{{lookup_user pr.assignee}}'   # Always assign to PR assignee (if set)
   ```

3. **Integration secret:** The integration attachment now works correctly with the full payload structure. Make sure you have the `ASANA_GITHUB_INTEGRATION_SECRET` configured.

4. **Title format:** The `{{clean_title pr.title}}` helper matches the old `cleanTitle()` function behavior, removing conventional commit prefixes.

5. **Skip if exists:** The `has_asana_tasks: false` condition automatically handles the "skip if PR already has Asana task" logic.

## Commenting when Asana URL is Missing

If you want to prompt for an Asana URL when one is missing (similar to the old `comment_on_pr_when_asana_url_missing` option), use a rule with the `has_asana_tasks: false` condition:

```yaml
rules:
  # Post comment when PR is opened without Asana task
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
    then:
      post_pr_comment: |
        Please add the Asana task URL to this PR description so the workflow can update the Asana custom fields.

        Example:
        - https://app.asana.com/0/<project_id>/<task_id>
```

This gives you more flexibility than the old boolean option:
- Customize the message
- Trigger on different events/actions
- Combine with other conditions (e.g., only for certain labels or authors)
