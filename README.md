# Asana GitHub Sync

A GitHub Action that syncs GitHub pull requests to Asana tasks using flexible, rule-based automation.

📚 **[View Full Documentation →](https://planningcenter.github.io/asana-github-sync/)**

## Features

- **Rule-based automation**: Define custom rules for different PR events (opened, closed, edited, etc.)
- **Task creation**: Automatically create Asana tasks from PRs
- **Custom field updates**: Update Asana custom fields based on PR state
- **Handlebars templating**: Dynamic content generation for task titles and descriptions
- **Task completion**: Mark tasks complete when PRs are merged

## Basic Usage

```yaml
name: Asana Sync
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
      - uses: actions/checkout@v6
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

## Documentation

- **[Getting Started](https://planningcenter.github.io/asana-github-sync/guide/)** - Installation and setup
- **[Examples](https://planningcenter.github.io/asana-github-sync/examples/basic-status-update)** - Real-world workflows
- **[Conditions](https://planningcenter.github.io/asana-github-sync/reference/conditions/)** - When rules trigger
- **[Actions](https://planningcenter.github.io/asana-github-sync/reference/actions/)** - What rules do
- **[Templates](https://planningcenter.github.io/asana-github-sync/concepts/templates)** - Dynamic values with Handlebars

## Quick Reference

### Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `asana_token` | Yes | Asana Personal Access Token |
| `github_token` | Yes | GitHub token (use `secrets.GITHUB_TOKEN`) |
| `rules` | Yes | YAML rules configuration |
| `user_mappings` | No | Map GitHub usernames to Asana user GIDs |
| `integration_secret` | No | Asana-GitHub integration secret |
| `dry_run` | No | Preview changes without executing (default: `false`) |

[Complete input documentation →](https://planningcenter.github.io/asana-github-sync/reference/inputs-outputs)

### Outputs

| Output | Description |
|--------|-------------|
| `task_ids` | Comma-separated list of task IDs |
| `field_updates` | Number of field updates applied |
| `tasks_created` | Number of tasks created |

[Complete output documentation →](https://planningcenter.github.io/asana-github-sync/reference/inputs-outputs)

## Error Handling

**This action never fails your workflows.** All errors are logged but do not block PR operations.

When sync failures occur:
- ✅ Your PR workflow continues normally
- ⚠️ Errors are logged to GitHub Actions output
- ℹ️ Asana tasks may not reflect latest PR state

This design ensures that Asana sync issues never prevent code from being merged or deployed.

Check the Actions logs if you notice tasks are not updating as expected.

[Complete error handling documentation →](https://planningcenter.github.io/asana-github-sync/reference/error-handling)

## License

MIT