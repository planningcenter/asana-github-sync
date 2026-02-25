# Issue Task Creation

Automatically create Asana tasks when GitHub issues are opened.

## Use Case

When your team reports bugs or feature requests as GitHub issues, you want a corresponding Asana task created automatically — so nothing falls through the cracks between GitHub and Asana.

## Minimal Example

Create an Asana task for every new issue:

```yaml
rules:
  - when:
      event: issues
      action: opened
      has_asana_tasks: false
    then:
      create_task:
        project: '1234567890'    # Your project GID
        workspace: '0987654321'  # Your workspace GID
        title: 'GH Issue #{{issue.number}}: {{issue.title}}'
```

**What happens:**
1. A GitHub issue is opened
2. The action creates an Asana task titled `GH Issue #42: Bug: login fails`
3. The Asana task URL is appended to the issue body so there's a permanent link back

## With Full Description

Include the issue body so the Asana task has the full context:

```yaml
rules:
  - when:
      event: issues
      action: opened
      has_asana_tasks: false
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        title: 'GH Issue #{{issue.number}}: {{issue.title}}'
        notes: |
          {{issue.body}}

          ---
          Reported by: @{{issue.author}}
          GitHub Issue: {{issue.url}}
```

## With Initial Custom Fields

Set a status or category field when the task is created:

```yaml
rules:
  - when:
      event: issues
      action: opened
      has_asana_tasks: false
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        section: '1111111111'     # "Incoming" section GID
        title: 'GH Issue #{{issue.number}}: {{issue.title}}'
        notes: '{{issue.body}}'
        initial_fields:
          '2222222222': '3333333333'  # Status → "Needs Triage"
```

## With User Assignment

Assign the task to a specific Asana user based on who opened the issue:

```yaml
# In workflow inputs:
user_mappings: |
  alice: 1234567890
  bob: 0987654321

rules:
  - when:
      event: issues
      action: opened
      has_asana_tasks: false
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        title: 'GH Issue #{{issue.number}}: {{issue.title}}'
        assignee: '{{map_github_to_asana issue.author}}'
```

## Filter by Label

Only create tasks for issues with a specific label (e.g., `bug`):

```yaml
rules:
  - when:
      event: issues
      action: labeled
      label: bug
      has_asana_tasks: false
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        section: '4444444444'  # "Bugs" section GID
        title: '[Bug] {{issue.title}}'
        notes: '{{issue.body}}'
        initial_fields:
          '5555555555': '6666666666'  # Priority → "High"
```

## Combined PR and Issue Workflow

A single workflow file that handles both PRs and issues:

```yaml
# .github/workflows/asana-sync.yml
on:
  pull_request:
    types: [opened, closed, labeled, reopened, ready_for_review]
  issues:
    types: [opened, labeled]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: planningcenter/asana-github-sync@main
        with:
          asana_token: ${{ secrets.ASANA_TOKEN }}
          github_token: ${{ github.token }}
          rules: |
            rules:
              # PR: update status when opened for review
              - when:
                  event: pull_request
                  action: [opened, reopened]
                  draft: false
                then:
                  attach_pr_to_tasks: true
                  update_fields:
                    '1111111111': 'In Review'

              # PR: mark complete when merged
              - when:
                  event: pull_request
                  action: closed
                  merged: true
                then:
                  mark_complete: true
                  update_fields:
                    '1111111111': 'Done'

              # Issue: create Asana task for new issues
              - when:
                  event: issues
                  action: opened
                  has_asana_tasks: false
                then:
                  create_task:
                    project: '2222222222'
                    workspace: '3333333333'
                    title: 'GH Issue #{{issue.number}}: {{issue.title}}'
                    notes: '{{issue.body}}'
                    initial_fields:
                      '4444444444': '5555555555'  # Status → "Needs Triage"
```

## Workflow Configuration

Add `issues` to your workflow's `on:` block:

```yaml
on:
  issues:
    types: [opened]          # Minimal: just new issues
```

Or with more actions:

```yaml
on:
  issues:
    types: [opened, labeled]  # Create on open or label
```

::: warning Avoid `edited` with `has_asana_tasks: false`
After the action creates a task, it appends the Asana link to the issue body. This triggers an `issues.edited` event. If you have a rule for `action: edited` with `has_asana_tasks: false`, it will loop infinitely.

Always use `action: opened` (or `labeled`) for task creation rules, never `action: edited`.
:::

## Available Template Variables

In `issues` event rules, use `{{issue.*}}` variables:

| Variable | Example |
|----------|---------|
| `{{issue.number}}` | `42` |
| `{{issue.title}}` | `Bug: login fails` |
| `{{issue.body}}` | Full issue description |
| `{{issue.author}}` | `reporter-username` |
| `{{issue.assignee}}` | `maintainer` (if set) |
| `{{issue.url}}` | `https://github.com/...` |
| `{{issue.state}}` | `open` |

See [Context Variables](/reference/context-variables) for the complete reference.

## See Also

- [create_task reference](/reference/actions/create-task) - All task creation options
- [has_asana_tasks reference](/reference/conditions/has-asana-tasks) - Required condition
- [Context Variables](/reference/context-variables) - All `issue.*` template variables
- [Bot Task Creation](/examples/bot-task-creation) - Similar pattern for Dependabot PRs
