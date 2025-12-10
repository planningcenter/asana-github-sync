# Validation Rules

Rules configuration validation and error messages.

## Overview

The action validates your rules configuration before executing. This catches errors early and provides clear, actionable error messages.

All validation happens when the action starts - before any Asana API calls are made.

## General Rules

### rules Array

| Rule | Error Message |
|------|---------------|
| Must exist | `rules must be an array` |
| Cannot be empty | `rules array cannot be empty` |

### when Block

| Rule | Error Message |
|------|---------------|
| Must exist | `Rule N: Missing 'when' block` |

### then Block

| Rule | Error Message |
|------|---------------|
| Must exist | `Rule N: Missing 'then' block` |

## Condition Validation

### event (Required)

| Rule | Error Message |
|------|---------------|
| Must be string | `Rule N: 'event' must be a string` |

### action (Optional)

| Rule | Error Message |
|------|---------------|
| Must be string or array | `Rule N: 'action' must be a string or array` |
| Array cannot be empty | `Rule N: 'action' array cannot be empty` |

### merged (Optional)

| Rule | Error Message |
|------|---------------|
| Must be boolean | `Rule N: 'merged' must be a boolean` |

### draft (Optional)

| Rule | Error Message |
|------|---------------|
| Must be boolean | `Rule N: 'draft' must be a boolean` |

### label (Optional)

| Rule | Error Message |
|------|---------------|
| Must be string | `Rule N: 'label' must be a string` |

### has_asana_tasks (Optional)

| Rule | Error Message |
|------|---------------|
| Must be boolean | `Rule N: 'has_asana_tasks' must be a boolean` |

### author (Optional)

| Rule | Error Message |
|------|---------------|
| Must be string or array | `Rule N: 'author' must be a string or array` |
| Array cannot be empty | `Rule N: 'author' array cannot be empty` |

## Action Validation

### Mutual Exclusivity Rules

#### When has_asana_tasks: false

| Rule | Error Message |
|------|---------------|
| Must have create_task | `Rule N: has_asana_tasks: false requires create_task action` |
| Cannot have update_fields | `Rule N: has_asana_tasks: false cannot have update_fields` |
| Cannot have mark_complete | `Rule N: has_asana_tasks: false cannot have mark_complete` |

#### When has_asana_tasks: true (default)

| Rule | Error Message |
|------|---------------|
| Cannot have create_task | `Rule N: create_task requires has_asana_tasks: false` |
| Must have at least one action | `Rule N: must have at least one action (update_fields, mark_complete, or post_pr_comment)` |

### update_fields

| Rule | Error Message |
|------|---------------|
| Must be object | `Rule N: 'update_fields' must be an object` |
| Field GIDs must be numeric | `Rule N: Invalid field GID 'XXX' (must be numeric)` |

### mark_complete

| Rule | Error Message |
|------|---------------|
| Must be boolean | `Rule N: 'mark_complete' must be a boolean` |

### post_pr_comment

| Rule | Error Message |
|------|---------------|
| Must be string | `Rule N: 'post_pr_comment' must be a string` |
| Cannot be empty | `Rule N: 'post_pr_comment' cannot be empty` |

### create_task

#### Required Fields

| Field | Rule | Error Message |
|-------|------|---------------|
| project | Must exist and be string | `Rule N: create_task.project is required and must be a string` |
| project | Must be numeric GID | `Rule N: create_task.project must be a numeric GID` |
| workspace | Must exist and be string | `Rule N: create_task.workspace is required and must be a string` |
| workspace | Must be numeric GID | `Rule N: create_task.workspace must be a numeric GID` |
| title | Must exist and be string | `Rule N: create_task.title is required and must be a non-empty string` |

#### Optional Fields

| Field | Rule | Error Message |
|-------|------|---------------|
| section | Must be string if provided | `Rule N: create_task.section must be a string` |
| section | Must be numeric GID | `Rule N: create_task.section must be a numeric GID` |
| notes | Must be string if provided | `Rule N: create_task.notes must be a string` |
| html_notes | Must be string if provided | `Rule N: create_task.html_notes must be a string` |
| notes & html_notes | Cannot both exist | `Rule N: create_task cannot have both notes and html_notes` |
| assignee | Must be string if provided | `Rule N: create_task.assignee must be a string` |
| initial_fields | Must be object if provided | `Rule N: create_task.initial_fields must be an object` |
| initial_fields | Field GIDs must be numeric | `Rule N: create_task.initial_fields has invalid GID 'XXX' (must be numeric)` |

## Examples

### Valid Configuration

```yaml
rules:
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': 'In Review'
```

### Common Errors

#### Missing event

```yaml
# ❌ Error: 'event' must be a string
rules:
  - when:
      action: opened
    then:
      update_fields:
        '1234567890': 'Value'
```

#### Empty action array

```yaml
# ❌ Error: 'action' array cannot be empty
rules:
  - when:
      event: pull_request
      action: []
    then:
      update_fields:
        '1234567890': 'Value'
```

#### Wrong action combination

```yaml
# ❌ Error: create_task requires has_asana_tasks: false
rules:
  - when:
      event: pull_request
      has_asana_tasks: true
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        title: 'Task'
```

#### Non-numeric GID

```yaml
# ❌ Error: Invalid field GID 'status' (must be numeric)
rules:
  - when:
      event: pull_request
    then:
      update_fields:
        'status': 'In Review'
```

#### Missing required fields

```yaml
# ❌ Error: create_task.workspace is required
rules:
  - when:
      event: pull_request
      has_asana_tasks: false
    then:
      create_task:
        project: '1234567890'
        title: 'Task'
        # Missing workspace!
```

#### Both notes and html_notes

```yaml
# ❌ Error: cannot have both notes and html_notes
rules:
  - when:
      event: pull_request
      has_asana_tasks: false
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        title: 'Task'
        notes: 'Plain text'
        html_notes: '<b>HTML</b>'
```

#### Empty post_pr_comment

```yaml
# ❌ Error: 'post_pr_comment' cannot be empty
rules:
  - when:
      event: pull_request
    then:
      post_pr_comment: ""
```

#### No actions with has_asana_tasks: true

```yaml
# ❌ Error: must have at least one action
rules:
  - when:
      event: pull_request
      has_asana_tasks: true
    then:
      # No actions!
```

## GID Format

All GIDs must:
- Be strings (quoted in YAML)
- Contain only digits
- Not be empty

### Valid GIDs

```yaml
'1234567890'  # ✅ Correct
'0987654321'  # ✅ Correct
'1'           # ✅ Correct (single digit okay)
```

### Invalid GIDs

```yaml
1234567890    # ❌ Wrong - not a string
'abc123'      # ❌ Wrong - contains letters
'123-456'     # ❌ Wrong - contains hyphen
''            # ❌ Wrong - empty string
```

## Debugging Validation Errors

### Error Message Format

```
Rule 0: <error details>
Rule 1: <error details>
```

The rule index starts at 0 and matches your rules array position.

### Finding the Problem Rule

Count from the top of your rules array:

```yaml
rules:
  - when:      # Rule 0
      # ...
  - when:      # Rule 1
      # ...
  - when:      # Rule 2
      # ...
```

### Check Workflow Logs

Validation errors appear in the GitHub Actions log before any API calls:

```
Error: Rule 0: 'event' must be a string
```

## Validation Timing

Validation happens:
1. ✅ **At action start** - Before any Asana API calls
2. ❌ **Not at commit time** - No pre-commit validation
3. ❌ **Not in PR checks** - Only when workflow runs

To test validation:
- Trigger the workflow
- Check Actions logs for validation errors

## Best Practices

### Always Quote GIDs

```yaml
# ✅ Good
update_fields:
  '1234567890': 'Value'

# ❌ Bad
update_fields:
  1234567890: 'Value'
```

### Be Explicit with has_asana_tasks

```yaml
# ✅ Good - clear intent
when:
  event: pull_request
  has_asana_tasks: false
then:
  create_task:
    # ...

# ⚠️ Unclear - relies on default
when:
  event: pull_request
then:
  create_task:  # Will fail! Default is true
    # ...
```

### Check Array Conditions

```yaml
# ✅ Good - non-empty array
action: [opened, reopened]

# ❌ Bad - empty array
action: []
```

### One Action Minimum

When `has_asana_tasks: true`, include at least one action:

```yaml
# ✅ Good
then:
  update_fields:
    '1234567890': 'Value'

# ❌ Bad - no actions
then:
  # Empty!
```

## See Also

- [Conditions Reference](/reference/conditions/) - All condition types
- [Actions Reference](/reference/actions/) - All action types
- [create_task](/reference/actions/create-task) - Task creation validation
- [Troubleshooting](/guide/installation#troubleshooting) - Common issues
