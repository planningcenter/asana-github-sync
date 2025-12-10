# Asana GitHub Sync

A GitHub Action that syncs GitHub pull requests to Asana tasks using flexible, rule-based automation.

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

## Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `asana_token` | Yes | Asana Personal Access Token |
| `github_token` | Yes | GitHub token (use `secrets.GITHUB_TOKEN`) |
| `rules` | Yes | YAML rules configuration for PR event automation |
| `user_mappings` | No | JSON mapping GitHub usernames to Asana user GIDs |
| `integration_secret` | No | Asana-GitHub integration secret for rich PR attachments |

## Outputs

| Output | Description |
|--------|-------------|
| `task_ids` | Comma-separated list of task IDs found or created |
| `field_updates` | Number of field updates applied |
| `tasks_created` | Number of tasks created |

## License

MIT