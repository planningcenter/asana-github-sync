# Rules Overview

Understanding the rules system architecture and execution flow.

## What are Rules?

Rules are the core automation units in asana-github-sync. Each rule defines:
- **When** to trigger (conditions that must match)
- **Then** what to do (actions to perform)

```yaml
rules:
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': '0987654321'
```

## Rule Structure

### Basic Anatomy

```yaml
rules:
  - when:           # Conditions block
      event: ...    # Required: GitHub event name
      action: ...   # Optional: Event action filter
      # ... more conditions
    then:           # Actions block
      update_fields: ...  # Or create_task, mark_complete, post_pr_comment
```

### Multiple Rules

Rules are evaluated independently. All matching rules execute:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1111111111': '2222222222'

  - when:
      event: pull_request
      action: labeled
      label: ready-for-qa
    then:
      update_fields:
        '3333333333': '4444444444'
```

## Execution Flow

```
GitHub Event
    ↓
Action receives webhook
    ↓
Extract PR and task URLs
    ↓
For each rule:
    ├─→ Check conditions (AND logic)
    │   ├─→ event matches? ✓
    │   ├─→ action matches? ✓
    │   ├─→ draft matches? ✓
    │   └─→ All match? Continue
    │
    └─→ Execute actions
        ├─→ Evaluate templates
        ├─→ Call Asana API
        └─→ Post PR comment (if configured)
```

## Condition Logic

### AND Logic

All conditions in a `when` block must match:

```yaml
when:
  event: pull_request    # Must match
  action: opened         # AND must match
  draft: true            # AND must match
  label: urgent          # AND must match
```

If any condition fails, the rule is skipped.

### OR Logic

Create separate rules for OR behavior:

```yaml
# Rule 1: Match opened
- when:
    event: pull_request
    action: opened
  then:
    # ...

# Rule 2: Match reopened
- when:
    event: pull_request
    action: reopened
  then:
    # Same action
```

Or use array syntax for single condition:

```yaml
when:
  event: pull_request
  action: [opened, reopened]  # Matches either
```

## Default Behaviors

### Non-Draft PRs

By default, rules match **non-draft PRs only**:

```yaml
# These are equivalent:
when:
  event: pull_request
  action: opened

when:
  event: pull_request
  action: opened
  draft: false  # Redundant - this is the default
```

To match draft PRs:

```yaml
when:
  event: pull_request
  action: opened
  draft: true  # Explicitly match drafts
```

### Has Asana Tasks

The `has_asana_tasks` condition determines create vs update:

```yaml
# Create task (requires has_asana_tasks: false)
- when:
    event: pull_request
    has_asana_tasks: false
  then:
    create_task:
      project: '1234567890'
      # ...

# Update existing tasks (default: has_asana_tasks: true)
- when:
    event: pull_request
    # Omitting has_asana_tasks means true
  then:
    update_fields:
      '1234567890': '0987654321'
```

## Action Types

### Update Actions

Modify existing Asana tasks (requires `has_asana_tasks: true`):

- `update_fields` - Update custom fields
- `mark_complete` - Mark task complete
- `post_pr_comment` - Add GitHub PR comment

### Create Actions

Create new Asana tasks (requires `has_asana_tasks: false`):

- `create_task` - Create task with fields and metadata

### Combining Actions

You can combine multiple actions in a single rule:

```yaml
then:
  update_fields:
    '1234567890': '0987654321'
  mark_complete: true
  post_pr_comment: "Task updated and completed!"
```

**Restrictions:**
- Cannot use `create_task` with `update_fields` or `mark_complete`
- Must have at least one action in every `then` block

## Template Evaluation

Actions support Handlebars templates with PR context:

```yaml
then:
  update_fields:
    '1234567890': 'PR #{{pr.number}}: {{pr.title}}'
    '0987654321': '{{pr.author}}'
  post_pr_comment: |
    Updated task for {{pr.title}}
    Author: {{pr.author}}
```

### Available Context

- `pr.*` - PR data (number, title, body, author, etc.)
- `event.*` - Event data (name, action)
- `label.*` - Label data (when applicable)
- Handlebars helpers - Text processing, extraction, user mapping

See [Templates](/concepts/templates) for complete guide.

## Validation

Rules are validated before execution:

- **Required fields:** `event` in conditions, at least one action
- **Mutual exclusivity:** `create_task` vs update actions
- **GID format:** Must be numeric strings (e.g., `'1234567890'`)
- **Condition values:** Correct types (boolean for `draft`, string for `event`)

Invalid rules fail with descriptive error messages.

## Real-World Patterns

### Progressive Enhancement

Start simple, add complexity:

```yaml
rules:
  # Step 1: Basic status update
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': '1111111111'  # "In Review"

  # Step 2: Add completion on merge
  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      update_fields:
        '1234567890': '2222222222'  # "Shipped"
      mark_complete: true
```

### Lifecycle Tracking

Track entire PR journey:

```yaml
rules:
  - when: { event: pull_request, action: opened }
    then: { update_fields: { '1111': '2222' } }  # "In Review"

  - when: { event: pull_request, action: ready_for_review }
    then: { update_fields: { '1111': '2222' } }  # "In Review"

  - when: { event: pull_request, action: labeled, label: approved }
    then: { update_fields: { '1111': '3333' } }  # "Approved"

  - when: { event: pull_request, action: closed, merged: true }
    then:
      update_fields: { '1111': '4444' }  # "Shipped"
      mark_complete: true
```

### Bot vs Human Handling

Different behavior for bots:

```yaml
rules:
  # Create tasks for bots
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
      author: [dependabot[bot]]
    then:
      create_task:
        project: '1234567890'
        title: '{{clean_title pr.title}}'

  # Update tasks for humans
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: true
    then:
      update_fields:
        '1234567890': '0987654321'
```

## Next Steps

- [Conditions](/concepts/conditions) - All available conditions
- [Actions](/concepts/actions) - All available actions
- [Templates](/concepts/templates) - Handlebars templating guide
- [Examples](/examples/basic-status-update) - Real-world workflows
