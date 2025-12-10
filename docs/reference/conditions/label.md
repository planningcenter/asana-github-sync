# label

Filter by a specific label name when labels are added or removed.

## Type

`string`

## Description

The `label` condition matches the exact name of the label that was added or removed from a PR. This is typically used with `action: labeled` or `action: unlabeled`.

Use this to trigger different workflows based on team conventions like "ready-for-qa", "needs-review", or "hotfix".

## Syntax

```yaml
when:
  event: pull_request
  action: labeled
  label: 'ready-for-qa'   # Exact match
```

## Examples

### QA Workflow

Update Asana when PR is ready for QA:

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: 'ready-for-qa'
    then:
      update_fields:
        '1234567890': 'QA Requested'
      post_pr_comment: |
        ✅ QA requested! Asana task updated.
```

### Build Automation

React to build labels:

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: 'build_created'
    then:
      update_fields:
        '1234567890': 'Build Ready'
        '1111111111': '{{extract_from_comments "Build #(\\d+)"}}'
```

### Priority Handling

Track high-priority PRs:

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: 'priority: high'
    then:
      update_fields:
        '1234567890': 'High Priority'
      post_pr_comment: |
        🔥 High priority PR - Asana task updated
```

### Different Labels → Different Actions

Create rules for multiple labels:

```yaml
rules:
  # Ready for QA
  - when:
      event: pull_request
      action: labeled
      label: 'ready-for-qa'
    then:
      update_fields:
        '1234567890': 'QA Requested'

  # Needs review
  - when:
      event: pull_request
      action: labeled
      label: 'needs-review'
    then:
      update_fields:
        '1234567890': 'Review Needed'

  # Hotfix
  - when:
      event: pull_request
      action: labeled
      label: 'hotfix'
    then:
      update_fields:
        '1234567890': 'Urgent'
```

### Handle Label Removal

React to labels being removed:

```yaml
rules:
  - when:
      event: pull_request
      action: unlabeled
      label: 'do-not-merge'
    then:
      update_fields:
        '1234567890': 'Ready to Merge'
      post_pr_comment: |
        ✅ "do-not-merge" label removed. PR is ready!
```

## Workflow Configuration

Make sure your workflow triggers on label events:

```yaml
on:
  pull_request:
    types:
      - labeled      # When label is added
      - unlabeled    # When label is removed
```

::: tip
You typically want both `action: labeled` AND `label: 'name'` together. The action tells you a label was added, and the label condition specifies which one.
:::

## Label Naming

Labels are matched exactly (case-sensitive):

| Label in GitHub | Condition | Match? |
|----------------|-----------|--------|
| `ready-for-qa` | `label: 'ready-for-qa'` | ✅ Yes |
| `Ready-for-QA` | `label: 'ready-for-qa'` | ❌ No |
| `ready for qa` | `label: 'ready-for-qa'` | ❌ No |

## Common Patterns

### Build Notifications

Many teams use labels to track build status:

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: 'build_created'
    then:
      update_fields:
        '1234567890': 'Build Ready'
        '1111111111': '{{extract_from_comments "Version: ([\\d.]+)"}}'
```

### Review States

Track review progress with labels:

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: 'changes-requested'
    then:
      update_fields:
        '1234567890': 'Changes Needed'

  - when:
      event: pull_request
      action: labeled
      label: 'approved'
    then:
      update_fields:
        '1234567890': 'Approved'
```

### Team Routing

Route PRs to different teams:

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: 'team: backend'
    then:
      update_fields:
        '1234567890': 'Backend Review'

  - when:
      event: pull_request
      action: labeled
      label: 'team: frontend'
    then:
      update_fields:
        '1234567890': 'Frontend Review'
```

## Validation Rules

- **Optional**: Not required
- **Type**: Must be a string
- **Matching**: Exact match (case-sensitive)
- **Context**: Only meaningful with `action: labeled` or `action: unlabeled`

## Common Errors

### Using label without action

```yaml
# ❌ Wrong - label condition needs labeled/unlabeled action
when:
  event: pull_request
  action: opened
  label: 'ready-for-qa'  # Will never match!

# ✅ Correct - use with labeled action
when:
  event: pull_request
  action: labeled
  label: 'ready-for-qa'
```

### Case Mismatch

```yaml
# ❌ Wrong - case doesn't match
# (GitHub label is "ready-for-QA")
when:
  event: pull_request
  action: labeled
  label: 'ready-for-qa'  # Won't match!

# ✅ Correct - exact match
when:
  event: pull_request
  action: labeled
  label: 'ready-for-QA'
```

### Wrong Action

```yaml
# ❌ Wrong - workflow doesn't listen for labeled
on:
  pull_request:
    types: [opened, closed]

rules:
  - when:
      event: pull_request
      action: labeled  # This will never trigger!
      label: 'ready-for-qa'

# ✅ Correct - add labeled to workflow
on:
  pull_request:
    types: [opened, closed, labeled]
```

## Multiple Labels

If you need to match multiple labels, create separate rules:

```yaml
rules:
  # Match label A
  - when:
      event: pull_request
      action: labeled
      label: 'label-a'
    then:
      update_fields:
        '1234567890': 'Value A'

  # Match label B
  - when:
      event: pull_request
      action: labeled
      label: 'label-b'
    then:
      update_fields:
        '1234567890': 'Value B'
```

::: info
Currently, you cannot use an array of labels like `label: ['a', 'b']`. Create separate rules instead.
:::

## See Also

- [action](/reference/conditions/action) - Filter by event action (labeled, unlabeled)
- [GitHub Labels](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/managing-labels) - Managing labels
