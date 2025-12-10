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

This action works with any GitHub event, but is primarily designed for PR workflows:

| Event | Support | Description |
|-------|---------|-------------|
| `pull_request` | ✅ **Primary** | PR opened, closed, edited, labeled, etc. |
| `pull_request_target` | ✅ Supported | Similar to pull_request but runs in base branch context |
| `push` | ⚠️ Limited | Code pushed to a branch (no PR context) |
| `issues` | ⚠️ Limited | Issue events (no PR context) |
| `issue_comment` | ⚠️ Limited | Comments on issues or PRs |

::: tip
**Recommended: `pull_request`** - This is the primary event this action is designed for. It provides full PR context, Asana task extraction, and all template variables.
:::

::: info
While the action technically works with any GitHub event, events without PR context won't have access to PR-specific template variables like `pr.title`, `pr.author`, etc.
:::

For a complete list of GitHub events, see:
- [GitHub Events Documentation](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows)

## Examples

### Basic PR Event

Match any pull request event:

```yaml
rules:
  - when:
      event: pull_request
    then:
      update_fields:
        '1234567890': 'In Progress'
```

## Workflow Configuration

The `event` in your rule must match an event in your workflow's `on:` section:

```yaml
# .github/workflows/asana-sync.yml
on:
  pull_request:        # <-- Workflow listens for this event
    types: [opened, closed]

# In rules:
rules:
  - when:
      event: pull_request  # <-- Rule matches this event
    then:
      # ...
```

## Combining with Other Conditions

Use additional conditions to be more specific:

```yaml
rules:
  - when:
      event: pull_request
      action: opened           # Only when PR opens
      draft: false             # Only non-draft PRs
    then:
      update_fields:
        '1234567890': 'In Review'
```

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
