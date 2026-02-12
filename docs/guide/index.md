# Getting Started

Asana GitHub Sync is a GitHub Action that automatically syncs pull request events to Asana tasks using flexible, rule-based automation.

## What is Asana GitHub Sync?

Instead of manually updating Asana tasks as your PRs progress through review, merge, and deployment, this action automates the entire workflow using declarative YAML rules. You define **when** to trigger (PR events, labels, authors) and **what** to do (update fields, create tasks, post comments).

## Key Features

- **Rule-based automation** - Define custom rules for different PR events
- **Task creation** - Automatically create Asana tasks from PRs
- **Field updates** - Update Asana custom fields based on PR state
- **Template system** - Use Handlebars templates for dynamic content
- **Complete validation** - Catch configuration errors before deployment
- **Zero dependencies** - Pure GitHub Action, no external services

## Prerequisites

Before you begin, you'll need:

1. **Asana Personal Access Token** - [Create one here](https://app.asana.com/0/my-apps)
2. **GitHub repository** with Actions enabled
3. **Asana project** where your tasks live
4. **Custom field GIDs** from your Asana project (we'll show you how to find these)

## Quick Start

Here's a minimal example that updates an Asana task's status field when a PR opens:

```yaml
# .github/workflows/asana-sync.yml
name: Sync PR to Asana

on:
  pull_request:
    types: [opened]

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write  # For posting comments
      contents: read        # For reading PR data
    steps:
      - uses: planningcenter/asana-github-sync@main
        with:
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
```

### What this does:

1. **Triggers** when a PR is opened (`event: pull_request`, `action: opened`)
2. **Finds** Asana task links in the PR description
3. **Updates** the custom field with GID `1234567890` to the value `'In Review'`

## How It Works

The action follows this flow:

1. **GitHub event triggers** - PR opened, closed, labeled, etc.
2. **Extract Asana tasks** - Finds Asana URLs in PR description
3. **Evaluate rules** - Checks which rules match the current event
4. **Execute actions** - Updates fields, creates tasks, or posts comments
5. **Report results** - Outputs task IDs and update counts

## Common Use Cases

### Update status when PR opens
```yaml
- when:
    event: pull_request
    action: opened
  then:
    update_fields:
      '1234567890': 'In Review'
```

### Mark complete when PR merges
```yaml
- when:
    event: pull_request
    action: closed
    merged: true
  then:
    update_fields:
      '1234567890': 'Shipped'
    mark_complete: true
```

### Create tasks for bot PRs
```yaml
- when:
    event: pull_request
    action: opened
    has_asana_tasks: false
    author: dependabot[bot]
  then:
    create_task:
      project: '1234567890'
      workspace: '0987654321'
      title: '{{clean_title pr.title}}'
```

### Update on label
```yaml
- when:
    event: pull_request
    action: labeled
    label: 'ready-for-qa'
  then:
    update_fields:
      '1234567890': 'QA Requested'
```

## Next Steps

- [**Installation**](/guide/installation) - Detailed setup instructions and finding GIDs
- [**Your First Rule**](/guide/your-first-rule) - Step-by-step tutorial
- [**Examples**](/examples/basic-status-update) - Real-world examples
- [**Reference**](/reference/conditions/event) - Complete API documentation

## Need Help?

- Check the [Examples](/examples/basic-status-update) for copy-paste ready workflows
- See [Migration Guide](/migration/from-v1) if upgrading from older tools
- Review [Validation Rules](/reference/validation-rules) for common configuration errors
