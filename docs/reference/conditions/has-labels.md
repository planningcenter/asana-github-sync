# has_labels

Check if a PR currently has any of the specified labels.

## Type

`string | string[]`

## Description

The `has_labels` condition checks if the PR currently has any of the specified labels. This works with any PR event and checks the actual labels on the PR, not just the label from a `labeled` event.

Unlike [`label`](/reference/conditions/label) which only checks the label that triggered a `labeled` event, `has_labels` looks at all labels currently on the PR and matches if ANY of them are in your list.

Use this when you need to check for existing labels regardless of which event triggered the workflow.

## Syntax

```yaml
# Single label
when:
  event: pull_request
  has_labels: 'bug'

# Multiple labels (matches if PR has ANY of these)
when:
  event: pull_request
  has_labels: ['bug', 'hotfix', 'urgent']
```

## Examples

### PR Must Have Bug Label

Only update Asana if PR has the "bug" label:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      has_labels: 'bug'
    then:
      update_fields:
        '1234567890': 'Bug Fix'
```

### High-Priority PRs

Match PRs with any priority label:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      has_labels: ['priority: high', 'priority: critical', 'hotfix']
    then:
      update_fields:
        '1234567890': 'High Priority'
```

### Combine with Label Event

Check both which label was added AND what other labels exist:

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: 'build_created'           # Label that was JUST added
      has_labels: ['ready-for-qa', 'approved']  # AND PR currently has these
    then:
      update_fields:
        '1234567890': 'Build Ready for QA'
```

### Team-Specific Workflows

Different actions based on team labels:

```yaml
rules:
  # Backend team PRs
  - when:
      event: pull_request
      action: [opened, reopened]
      has_labels: 'team: backend'
    then:
      update_fields:
        '1234567890': 'Backend Review'

  # Frontend team PRs
  - when:
      event: pull_request
      action: [opened, reopened]
      has_labels: 'team: frontend'
    then:
      update_fields:
        '1234567890': 'Frontend Review'
```

### Any Environment Label

Match if PR has any environment-related label:

```yaml
rules:
  - when:
      event: pull_request
      action: closed
      merged: true
      has_labels: ['staging', 'production', 'qa-env']
    then:
      update_fields:
        '1234567890': 'Deployed'
```

## Label Matching

Labels are matched exactly (case-sensitive):

| PR Labels | Condition | Match? |
|-----------|-----------|--------|
| `['bug', 'feature']` | `has_labels: 'bug'` | ✅ Yes |
| `['bug', 'feature']` | `has_labels: ['bug', 'hotfix']` | ✅ Yes (has bug) |
| `['feature', 'docs']` | `has_labels: ['bug', 'hotfix']` | ❌ No |
| `['Bug', 'Feature']` | `has_labels: 'bug'` | ❌ No (case mismatch) |
| `[]` (no labels) | `has_labels: 'bug'` | ❌ No |

## Common Patterns

### Quality Gates

Require certain labels before proceeding:

```yaml
rules:
  # Only mark complete if PR has both labels
  - when:
      event: pull_request
      action: closed
      merged: true
      has_labels: ['reviewed', 'tested']
    then:
      update_fields:
        '1234567890': 'Complete'
      mark_complete: true
```

### Skip Certain PRs

Don't update if PR has a "skip" label:

```yaml
rules:
  # Regular PRs
  - when:
      event: pull_request
      action: opened
      has_labels: 'dependencies'
    then:
      update_fields:
        '1234567890': 'Dependency Update'

  # This rule won't match PRs without the label
```

### Multi-Condition Filtering

Combine with other conditions:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      draft: false
      has_labels: ['ready-for-review', 'approved']
      author: ['dependabot[bot]', 'renovate[bot]']
    then:
      update_fields:
        '1234567890': 'Bot PR Ready'
```

## Validation Rules

- **Optional**: Not required
- **Type**: Must be a string or array of strings
- **Array**: Cannot be empty if using array syntax
- **Matching**: Exact match (case-sensitive)
- **Logic**: Matches if PR has ANY of the specified labels (OR logic)

## Common Errors

### Empty Array

```yaml
# ❌ Wrong - empty array not allowed
when:
  event: pull_request
  has_labels: []

# ✅ Correct - provide at least one label
when:
  event: pull_request
  has_labels: 'bug'
```

### Case Mismatch

```yaml
# ❌ Wrong - case doesn't match
# (GitHub label is "Ready-For-QA")
when:
  event: pull_request
  has_labels: 'ready-for-qa'

# ✅ Correct - exact match
when:
  event: pull_request
  has_labels: 'Ready-For-QA'
```

### No Workflow Trigger

```yaml
# ❌ Wrong - workflow never triggers on PRs
on:
  issues:
    types: [opened]

rules:
  - when:
      event: pull_request  # This will never match!
      has_labels: 'bug'

# ✅ Correct - trigger on PR events
on:
  pull_request:
    types: [opened, reopened]
```

## Difference from `label`

| Feature | `label` | `has_labels` |
|---------|---------|-------------|
| **Checks** | Label that triggered event | All labels currently on PR |
| **When to use** | With `labeled` or `unlabeled` action | With any PR event |
| **Type** | Single string only | String or array |
| **Example** | `label: 'bug'` | `has_labels: ['bug', 'hotfix']` |

```yaml
# label - checks what was JUST added
- when:
    event: pull_request
    action: labeled
    label: 'ready-for-qa'  # This specific label was added

# has_labels - checks what PR HAS
- when:
    event: pull_request
    action: opened
    has_labels: 'ready-for-qa'  # PR currently has this label
```

## See Also

- [label](/reference/conditions/label) - Match the label that triggered an event
- [action](/reference/conditions/action) - Filter by event action
- [GitHub Labels](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/managing-labels) - Managing labels