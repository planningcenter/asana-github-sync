# merged

Filter by whether the PR was merged or just closed.

## Type

`boolean`

## Description

The `merged` condition distinguishes between PRs that were merged versus PRs that were closed without merging.

This is essential for handling the "PR shipped" vs "PR abandoned" scenarios differently.

## Syntax

```yaml
when:
  event: pull_request
  action: closed
  merged: true   # Only merged PRs
```

## Values

| Value | Meaning |
|-------|---------|
| `true` | PR was merged |
| `false` | PR was closed without merging |
| (omitted) | Both merged and non-merged |

## Examples

### Mark Complete When Merged

Update task and mark complete only when PR actually ships:

```yaml
rules:
  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      update_fields:
        '1234567890': 'Shipped'
      mark_complete: true
```

### Track Abandoned PRs

Handle PRs that were closed without merging:

```yaml
rules:
  - when:
      event: pull_request
      action: closed
      merged: false
    then:
      update_fields:
        '1234567890': 'Cancelled'
      post_pr_comment: |
        This PR was closed without merging.
```

### Different Actions for Merged vs Closed

Create separate workflows:

```yaml
rules:
  # When merged - ship it!
  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      update_fields:
        '1234567890': 'Shipped'
      mark_complete: true

  # When just closed - mark abandoned
  - when:
      event: pull_request
      action: closed
      merged: false
    then:
      update_fields:
        '1234567890': 'Abandoned'
```

## Common Pattern: Mark Complete on Merge

The most common use case is marking tasks complete when PRs merge:

```yaml
on:
  pull_request:
    types: [closed]

# In rules:
rules:
  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      update_fields:
        '1234567890': 'Shipped'
      mark_complete: true
      post_pr_comment: |
        ✅ PR merged! Asana task marked complete.
```

## Important Notes

::: warning
The `merged` condition only makes sense with `action: closed`. PRs can only be merged when they're being closed.
:::

::: tip
If you omit `merged`, the rule will trigger for both merged and non-merged closes. Use `merged: true` or `merged: false` to be explicit.
:::

## Validation Rules

- **Optional**: Not required
- **Type**: Must be boolean (`true` or `false`)
- **Context**: Only meaningful for `pull_request` events with `action: closed`

## Common Errors

### Using merged without action: closed

```yaml
# ❌ Wrong - merged only applies to closed PRs
when:
  event: pull_request
  action: opened
  merged: true  # This will never match!

# ✅ Correct - use with closed action
when:
  event: pull_request
  action: closed
  merged: true
```

### String Instead of Boolean

```yaml
# ❌ Wrong - merged must be boolean
when:
  event: pull_request
  action: closed
  merged: "true"

# ✅ Correct - use true/false (no quotes)
when:
  event: pull_request
  action: closed
  merged: true
```

## Workflow Tips

### Separate Workflows for Clarity

Some teams prefer separate workflows for different outcomes:

```yaml
# merged-pr.yml - Handle successful merges
on:
  pull_request:
    types: [closed]

rules:
  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      # Ship it!
```

```yaml
# closed-pr.yml - Handle abandoned PRs
on:
  pull_request:
    types: [closed]

rules:
  - when:
      event: pull_request
      action: closed
      merged: false
    then:
      # Clean up
```

### Combined Workflow

Or handle both in one workflow with different rules:

```yaml
on:
  pull_request:
    types: [opened, closed]

rules:
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': 'In Review'

  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      update_fields:
        '1234567890': 'Shipped'
      mark_complete: true

  - when:
      event: pull_request
      action: closed
      merged: false
    then:
      update_fields:
        '1234567890': 'Cancelled'
```

## See Also

- [action](/reference/conditions/action) - Filter by event action
- [mark_complete](/reference/actions/mark-complete) - Mark task complete action
- [draft](/reference/conditions/draft) - Filter by draft status
