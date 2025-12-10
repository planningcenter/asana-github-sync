# draft

Filter by whether the PR is a draft or ready for review.

## Type

`boolean`

## Description

The `draft` condition filters based on the PR's draft status. Use this to skip draft PRs or only act on PRs that are ready for review.

Draft PRs are often work-in-progress and may not be ready for team notification or status updates.

## Syntax

```yaml
when:
  event: pull_request
  draft: false   # Only non-draft PRs
```

## Values

| Value | Meaning |
|-------|---------|
| `true` | PR is a draft |
| `false` | PR is ready for review (not a draft) |
| (omitted) | Both draft and non-draft PRs |

## Examples

### Skip Draft PRs

Only update Asana for PRs ready for review:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      draft: false   # Skip drafts
    then:
      update_fields:
        '1234567890': 'In Review'
```

### Handle Draft Conversion

Update when draft is marked ready:

```yaml
rules:
  - when:
      event: pull_request
      action: ready_for_review
      draft: false
    then:
      update_fields:
        '1234567890': 'In Review'
      post_pr_comment: |
        ✅ PR is ready for review! Asana task updated.
```

### Track Work in Progress

Specifically handle draft PRs:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      draft: true
    then:
      update_fields:
        '1234567890': 'Work in Progress'
```

### Different States for Draft vs Ready

Use separate rules:

```yaml
rules:
  # Draft PR opened
  - when:
      event: pull_request
      action: opened
      draft: true
    then:
      update_fields:
        '1234567890': 'WIP'

  # Non-draft PR opened
  - when:
      event: pull_request
      action: opened
      draft: false
    then:
      update_fields:
        '1234567890': 'In Review'

  # Draft converted to ready
  - when:
      event: pull_request
      action: ready_for_review
    then:
      update_fields:
        '1234567890': 'Ready for Review'
```

## Common Use Cases

### Skip Drafts Entirely

Most teams don't want notifications for draft PRs:

```yaml
rules:
  - when:
      event: pull_request
      action: [opened, reopened]
      draft: false  # Only act on ready PRs
    then:
      update_fields:
        '1234567890': 'In Review'
```

### Track Draft State

Some teams track work-in-progress:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      draft: true
    then:
      update_fields:
        '1234567890': 'In Progress'
      post_pr_comment: |
        Draft PR created. Will notify when ready for review.
```

### Notify on Ready

Alert team when draft becomes ready:

```yaml
rules:
  - when:
      event: pull_request
      action: ready_for_review
    then:
      update_fields:
        '1234567890': 'Ready for Review'
      post_pr_comment: |
        🎉 @team This PR is ready for review!
```

## Related Actions

GitHub provides specific actions for draft PRs:

| Action | Description |
|--------|-------------|
| `ready_for_review` | Draft PR marked as ready |
| `converted_to_draft` | PR converted to draft |

Use these with the `draft` condition:

```yaml
on:
  pull_request:
    types: [opened, ready_for_review, converted_to_draft]

rules:
  - when:
      event: pull_request
      action: converted_to_draft
      draft: true
    then:
      update_fields:
        '1234567890': 'On Hold'
```

## Validation Rules

- **Optional**: Not required
- **Type**: Must be boolean (`true` or `false`)
- **Context**: Only meaningful for `pull_request` events

## Common Errors

### String Instead of Boolean

```yaml
# ❌ Wrong - draft must be boolean
when:
  event: pull_request
  draft: "false"

# ✅ Correct - use true/false (no quotes)
when:
  event: pull_request
  draft: false
```

### Assuming draft Status

```yaml
# ❌ Wrong - ready_for_review means it's no longer a draft
when:
  event: pull_request
  action: ready_for_review
  draft: true  # This will never match!

# ✅ Correct - it's not a draft anymore
when:
  event: pull_request
  action: ready_for_review
  draft: false  # Or omit draft entirely
```

## Workflow Configuration

Make sure your workflow listens for draft-related actions:

```yaml
on:
  pull_request:
    types:
      - opened
      - reopened
      - ready_for_review     # When draft becomes ready
      - converted_to_draft   # When converted to draft
```

## Best Practices

### Default: Skip Drafts

Most teams should skip draft PRs by default:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      draft: false  # Explicitly skip drafts
    then:
      # Your actions
```

### Be Explicit

Even if you don't care about draft status, being explicit helps future maintainers:

```yaml
# Good - clear intent
when:
  event: pull_request
  action: opened
  draft: false  # We only care about ready PRs

# Less clear - will match both
when:
  event: pull_request
  action: opened
  # No draft condition - matches both draft and ready
```

## See Also

- [action](/reference/conditions/action) - Filter by event action (ready_for_review, converted_to_draft)
- [merged](/reference/conditions/merged) - Filter by merge status
- [GitHub Draft PRs](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests#draft-pull-requests) - About draft PRs
