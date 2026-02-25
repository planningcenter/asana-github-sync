# event

The GitHub event name that triggers the workflow. **This is the only required condition.**

## Type

`string`

## Description

The `event` condition matches against the GitHub event that triggered the workflow. This corresponds to the event name in your workflow's `on:` section.

Every rule must specify an `event` - it's the only required condition field.

## Syntax

```yaml
when:
  event: pull_request  # Required
```

## Supported Events

| Event | Support | Description |
|-------|---------|-------------|
| `pull_request` | ✅ **Primary** | PR opened, closed, edited, labeled, etc. Full PR context and all features. |
| `issues` | ✅ **Supported** | Issue opened, closed, labeled, etc. Full issue context and task creation. |
| `pull_request_target` | ⚠️ Limited | Similar to `pull_request` but runs in base branch context. |
| `push` | ❌ Unsupported | No PR or issue context available. |
| `issue_comment` | ❌ Unsupported | No PR or issue context available. |

::: tip
**`pull_request` and `issues` are the two supported events.** Both provide full context and support all relevant features. The action returns early with a warning for any other event type.
:::

For a complete list of GitHub events, see:
- [GitHub Events Documentation](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)

## Examples

### PR Event

Match any pull request event:

```yaml
rules:
  - when:
      event: pull_request
    then:
      update_fields:
        '1234567890': 'In Progress'
```

### Issues Event

Create an Asana task when a GitHub issue is opened:

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
        notes: '{{issue.body}}'
```

## Workflow Configuration

The `event` in your rule must match an event in your workflow's `on:` section. To handle both PRs and issues, listen for both events:

```yaml
# .github/workflows/asana-sync.yml
on:
  pull_request:
    types: [opened, closed, labeled, reopened, ready_for_review]
  issues:
    types: [opened, closed, labeled, reopened]

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
              - when:
                  event: pull_request
                  action: opened
                  draft: false
                then:
                  update_fields:
                    '1234567890': 'In Review'

              - when:
                  event: issues
                  action: opened
                  has_asana_tasks: false
                then:
                  create_task:
                    project: '1234567890'
                    workspace: '0987654321'
                    title: 'Issue #{{issue.number}}: {{issue.title}}'
```

## Combining with Other Conditions

Use additional conditions to be more specific:

```yaml
rules:
  # PR-specific conditions
  - when:
      event: pull_request
      action: opened
      draft: false             # PR-only condition
    then:
      update_fields:
        '1234567890': 'In Review'

  # Issue-specific rule
  - when:
      event: issues
      action: opened
      has_asana_tasks: false
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        title: '{{issue.title}}'
```

::: info PR-only conditions
The `merged` and `draft` conditions are **PR-only** — they will never match on an `issues` event, even if specified.
:::

## Validation Rules

- **Required**: Every rule must have an `event`
- **Type**: Must be a string
- **Case-sensitive**: Use lowercase (e.g., `pull_request`, not `Pull_Request`)

## Common Errors

### Missing event

```yaml
# ❌ Wrong - no event specified
when:
  action: opened
then:
  # ...

# ✅ Correct
when:
  event: pull_request
  action: opened
then:
  # ...
```

### Wrong event name

```yaml
# ❌ Wrong - workflow doesn't listen for 'push'
on:
  pull_request:

rules:
  - when:
      event: push  # This will never match!
    then:
      # ...
```

## See Also

- [action](/reference/conditions/action) - Filter by specific event actions
- [Workflow Triggers](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows) - All GitHub event types
