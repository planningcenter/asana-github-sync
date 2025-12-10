# mark_complete

Mark existing Asana tasks as complete.

## Type

`boolean`

## Description

The `mark_complete` action marks all tasks linked in the PR description as complete. This is **only allowed** when `has_asana_tasks: true` (default) or when the PR has Asana task URLs.

Use this to automatically complete tasks when PRs are merged or when work is done.

::: warning Critical Requirement
`mark_complete` requires `has_asana_tasks: true` (default). You cannot mark non-existent tasks as complete.
:::

## Syntax

```yaml
then:
  mark_complete: true
```

## Examples

### Mark Complete on Merge

Most common pattern - complete tasks when PR ships:

```yaml
rules:
  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      mark_complete: true
```

### With Field Update

Update status and mark complete:

```yaml
rules:
  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      update_fields:
        '1234567890': '0987654321'  # Status → "Shipped"
      mark_complete: true
```

### With PR Comment

Notify and complete:

```yaml
rules:
  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      update_fields:
        '1234567890': '0987654321'  # Status → "Shipped"
      mark_complete: true
      post_pr_comment: |
        ✅ PR merged! Asana task marked complete.
```

### Conditional Completion

Only mark complete for certain PRs:

```yaml
rules:
  # Regular PRs - just mark complete
  - when:
      event: pull_request
      action: closed
      merged: true
      draft: false
    then:
      mark_complete: true

  # Don't mark complete for draft PRs that get merged
  # (no rule = no action)
```

### Label-Based Completion

Complete when specific label added:

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: 'deployed-to-production'
    then:
      update_fields:
        '1234567890': '0987654321'  # Status → "Deployed"
      mark_complete: true
```

## Combining Actions

`mark_complete` can be combined with other actions:

| Action | Compatible? | Example |
|--------|-------------|---------|
| `update_fields` | ✅ Yes | Update status then mark complete |
| `post_pr_comment` | ✅ Yes | Post comment and mark complete |
| `create_task` | ❌ No | Different conditions required |

### Update Then Complete

```yaml
then:
  update_fields:
    '1234567890': '0987654321'  # Status → "Shipped"
  mark_complete: true
```

### Complete with Notification

```yaml
then:
  mark_complete: true
  post_pr_comment: |
    ✅ Work completed! Task marked done in Asana.
```

## Behavior

When `mark_complete: true`:
1. Action finds all Asana task URLs in PR description
2. Each task is marked complete in Asana
3. Completion timestamp is recorded
4. Task moves to completed section in Asana

::: tip
If a task is already complete, marking it complete again is safe (no error).
:::

## Common Patterns

### Standard Merge Workflow

The most common pattern:

```yaml
rules:
  # When PR opens
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': '1111111111'  # Status → "In Review"

  # When PR merges
  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      update_fields:
        '1234567890': '2222222222'  # Status → "Shipped"
      mark_complete: true
```

### Skip Draft PRs

Don't complete draft PR tasks:

```yaml
rules:
  - when:
      event: pull_request
      action: closed
      merged: true
      draft: false  # Only non-draft PRs
    then:
      mark_complete: true
```

### Complete on Deployment

Wait for deployment label:

```yaml
rules:
  # PR merged → update status
  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      update_fields:
        '1234567890': '1111111111'  # Status → "Merged"

  # Deployment label → mark complete
  - when:
      event: pull_request
      action: labeled
      label: 'deployed'
    then:
      update_fields:
        '1234567890': '2222222222'  # Status → "Deployed"
      mark_complete: true
```

### Author-Specific Completion

Different completion logic per author:

```yaml
rules:
  # Bot PRs - auto complete on merge
  - when:
      event: pull_request
      action: closed
      merged: true
      author: ['dependabot[bot]', 'renovate[bot]']
    then:
      mark_complete: true

  # Human PRs - just update status
  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      update_fields:
        '1234567890': '0987654321'  # Status → "Shipped"
      # Don't auto-complete - let humans decide
```

## Validation Rules

- **Requires**: `has_asana_tasks: true` (default)
- **Type**: Must be boolean (`true` or `false`)
- **Typical value**: `true` (marking incomplete rarely used)

## Common Errors

### Using with has_asana_tasks: false

```yaml
# ❌ Wrong - can't complete non-existent tasks
when:
  event: pull_request
  has_asana_tasks: false
then:
  mark_complete: true
  # Error: has_asana_tasks: false cannot have mark_complete

# ✅ Correct - use with existing tasks
when:
  event: pull_request
  has_asana_tasks: true  # Or omit
then:
  mark_complete: true
```

### Wrong type

```yaml
# ❌ Wrong - must be boolean
then:
  mark_complete: "true"

# ✅ Correct - use boolean
then:
  mark_complete: true
```

### Using with create_task

```yaml
# ❌ Wrong - incompatible conditions
when:
  event: pull_request
  has_asana_tasks: false
then:
  create_task:
    # ...
  mark_complete: true  # Error!

# ✅ Correct - separate rules
rules:
  # Create task
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
    then:
      create_task:
        # ...

  # Mark complete (different rule, different PR)
  - when:
      event: pull_request
      action: closed
      merged: true
      has_asana_tasks: true
    then:
      mark_complete: true
```

## When to Mark Complete

### ✅ Good Use Cases

- PR merged to main/production branch
- Deployment label added
- QA approval received
- All checks passing and approved

### ⚠️ Consider Carefully

- Closing PR without merge (might be abandoned)
- Draft PRs (might not be real work)
- Bot PRs (depends on your workflow)

### ❌ Avoid

- PR opened (work just started!)
- Changes pushed (work in progress)
- PR converted to draft (not ready)

## See Also

- [merged](/reference/conditions/merged) - Filter by merge status
- [update_fields](/reference/actions/update-fields) - Update fields before completing
- [post_pr_comment](/reference/actions/post-comment) - Notify about completion
- [has_asana_tasks](/reference/conditions/has-asana-tasks) - Required condition
