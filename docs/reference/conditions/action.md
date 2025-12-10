# action

Filter by specific actions within a GitHub event.

## Type

`string | string[]`

## Description

The `action` condition narrows down which specific action triggered the event. For example, a `pull_request` event can have actions like `opened`, `closed`, `edited`, `labeled`, etc.

Use this to create different rules for different PR lifecycle stages.

## Syntax

```yaml
# Single action
when:
  event: pull_request
  action: opened

# Multiple actions (any match)
when:
  event: pull_request
  action: [opened, reopened]
```

## Common Pull Request Actions

| Action | When It Triggers |
|--------|-----------------|
| `opened` | PR is first created |
| `reopened` | Previously closed PR is reopened |
| `closed` | PR is closed (merged or not) |
| `edited` | PR title or description is changed |
| `labeled` | Label is added to PR |
| `unlabeled` | Label is removed from PR |
| `synchronize` | New commits pushed to PR |
| `ready_for_review` | Draft PR marked as ready |
| `converted_to_draft` | PR converted to draft |

## Examples

### Single Action

Trigger only when PR opens:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': 'In Review'
```

### Multiple Actions

Trigger on open or reopen:

```yaml
rules:
  - when:
      event: pull_request
      action: [opened, reopened]
    then:
      update_fields:
        '1234567890': 'In Review'
```

### Different Rules for Different Actions

Create separate rules for different actions:

```yaml
rules:
  # When PR opens
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': 'In Review'

  # When PR closes
  - when:
      event: pull_request
      action: closed
    then:
      update_fields:
        '1234567890': 'Done'
```

### Label Actions

React to labels being added:

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: 'ready-for-qa'
    then:
      update_fields:
        '1234567890': 'QA Requested'
```

### Code Changes

Trigger when new commits are pushed:

```yaml
rules:
  - when:
      event: pull_request
      action: synchronize
    then:
      update_fields:
        '1234567890': 'Changes Requested'
```

## Workflow Configuration

Make sure your workflow listens for the actions you want to match:

```yaml
# .github/workflows/asana-sync.yml
on:
  pull_request:
    types: [opened, closed, labeled]  # <-- Specify which actions

# In rules:
rules:
  - when:
      event: pull_request
      action: opened  # Must be in workflow types
    then:
      # ...
```

::: tip
If you don't specify `types:` in your workflow, GitHub uses a default set. Explicitly list them to be clear about what triggers your workflow.
:::

## Combining with Other Conditions

Layer multiple conditions for precise matching:

```yaml
rules:
  - when:
      event: pull_request
      action: closed
      merged: true    # Only when merged (not just closed)
    then:
      update_fields:
        '1234567890': 'Shipped'
      mark_complete: true
```

## Validation Rules

- **Optional**: Not required, but very commonly used
- **Type**: String for single action, array of strings for multiple
- **Array**: Cannot be empty if using array format
- **Case-sensitive**: Use lowercase (e.g., `opened`, not `Opened`)

## Common Errors

### Empty Array

```yaml
# ❌ Wrong - empty array not allowed
when:
  event: pull_request
  action: []

# ✅ Correct - single action or non-empty array
when:
  event: pull_request
  action: opened
```

### Action Not in Workflow Types

```yaml
# ❌ Wrong - workflow doesn't listen for 'edited'
on:
  pull_request:
    types: [opened]

rules:
  - when:
      event: pull_request
      action: edited  # This will never trigger!
    then:
      # ...

# ✅ Correct - add to workflow types
on:
  pull_request:
    types: [opened, edited]
```

### Wrong Action Name

```yaml
# ❌ Wrong - there's no 'merged' action
when:
  event: pull_request
  action: merged

# ✅ Correct - use 'closed' with 'merged: true'
when:
  event: pull_request
  action: closed
  merged: true
```

## See Also

- [event](/reference/conditions/event) - The GitHub event name
- [merged](/reference/conditions/merged) - Filter by PR merge status
- [label](/reference/conditions/label) - Filter by specific label name
- [GitHub PR Events](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request) - All pull_request actions
