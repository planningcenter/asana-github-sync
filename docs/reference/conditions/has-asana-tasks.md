# has_asana_tasks

Filter by whether the PR description contains Asana task links.

## Type

`boolean`

## Default

`true` (if omitted)

## Description

The `has_asana_tasks` condition determines whether the PR description contains any Asana task URLs. This is a **critical condition** that controls whether you're creating new tasks or updating existing ones.

This condition fundamentally changes what actions are allowed:
- `has_asana_tasks: false` - PR has **no** Asana links → **Can create tasks**
- `has_asana_tasks: true` (default) - PR **has** Asana links → **Can update tasks**

## Syntax

```yaml
# Update existing tasks (default behavior)
when:
  event: pull_request
  # has_asana_tasks: true (implicit)

# Create new tasks
when:
  event: pull_request
  has_asana_tasks: false
```

## Task URLs Detected

The action looks for Asana URLs in PR descriptions:

| URL Format | Detected? |
|------------|-----------|
| `https://app.asana.com/0/1234567890/9876543210` | ✅ Yes |
| `https://app.asana.com/0/0/9876543210` | ✅ Yes |
| `https://app.asana.com/0/1234567890/9876543210/f` | ✅ Yes |
| `asana.com/0/1234567890/9876543210` | ❌ No (must include https://) |
| Task mentioned in comments | ❌ No (only PR description) |

## Critical: Mutual Exclusivity

The value of `has_asana_tasks` determines which actions are allowed:

### When `has_asana_tasks: false` (no tasks found)

**Allowed:**
- ✅ `create_task` - Create new tasks
- ✅ `post_pr_comment` - Post comments

**Not Allowed:**
- ❌ `update_fields` - No tasks to update!
- ❌ `mark_complete` - No tasks to complete!

### When `has_asana_tasks: true` (tasks found)

**Allowed:**
- ✅ `update_fields` - Update existing tasks
- ✅ `mark_complete` - Mark existing tasks complete
- ✅ `post_pr_comment` - Post comments

**Not Allowed:**
- ❌ `create_task` - Tasks already exist!

## Examples

### Create Tasks for Bot PRs

Dependabot PRs don't have Asana links - create them automatically:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false   # No Asana URL in description
      author: dependabot[bot]
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        title: '{{clean_title pr.title}}'
        html_notes: '<a href="{{pr.url}}">{{pr.title}}</a>'
```

### Update Existing Tasks

Default behavior - update tasks linked in PR:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      # has_asana_tasks: true (implicit default)
    then:
      update_fields:
        '1234567890': 'In Review'
```

### Prompt for Asana URL

Ask users to add Asana link if missing:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
    then:
      post_pr_comment: |
        ⚠️ No Asana task found in PR description.

        Please add the Asana task URL to track this work:
        ```
        https://app.asana.com/0/PROJECT/TASK
        ```
```

### Separate Workflows

Handle both scenarios with different rules:

```yaml
rules:
  # Create tasks when missing
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
      author: [dependabot[bot], renovate[bot]]
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        title: '{{pr.title}}'

  # Update tasks when present
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: true
    then:
      update_fields:
        '1234567890': 'In Review'
```

## Default Behavior

If you omit `has_asana_tasks`, it defaults to `true`:

```yaml
# These are equivalent:
when:
  event: pull_request

when:
  event: pull_request
  has_asana_tasks: true
```

::: tip
Be explicit! Even though `true` is the default, writing `has_asana_tasks: true` makes your intent clearer.
:::

## Common Patterns

### Bot Task Creation

Create tasks only for bot PRs:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
      author: [dependabot[bot], renovate[bot]]
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        title: '{{clean_title pr.title}}'
```

### Require Asana Links

Enforce that all PRs have Asana tasks:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
    then:
      post_pr_comment: |
        ❌ Asana task required!

        Please add the Asana task URL to your PR description.
```

### Mixed Strategy

Some PRs have tasks, some don't:

```yaml
rules:
  # Bots: Create tasks
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
      author: dependabot[bot]
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        title: '{{pr.title}}'

  # Humans: Update existing tasks
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: true
    then:
      update_fields:
        '1234567890': 'In Review'

  # Humans without tasks: Prompt
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
      author: [dependabot[bot], renovate[bot]]  # NOT bots
    then:
      post_pr_comment: |
        Please add Asana task URL
```

Wait, that last rule has a bug. Let me fix that:

```yaml
rules:
  # Update existing tasks (most PRs)
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: true
    then:
      update_fields:
        '1234567890': 'In Review'

  # Create tasks for bot PRs without links
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
      author: [dependabot[bot], renovate[bot]]
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        title: '{{pr.title}}'

  # Prompt humans to add Asana link
  # (This catches human PRs without tasks)
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
    then:
      post_pr_comment: |
        ⚠️ Please add Asana task URL to PR description
```

## Validation Rules

- **Optional**: Defaults to `true` if omitted
- **Type**: Must be boolean (`true` or `false`)
- **Actions**: Determines which actions are allowed (see Mutual Exclusivity section)

## Common Errors

### Creating tasks when tasks exist

```yaml
# ❌ Wrong - can't create if tasks already exist
when:
  event: pull_request
  has_asana_tasks: true
then:
  create_task:
    # Error: has_asana_tasks: true cannot have create_task

# ✅ Correct - create only when no tasks
when:
  event: pull_request
  has_asana_tasks: false
then:
  create_task:
    # ...
```

### Updating non-existent tasks

```yaml
# ❌ Wrong - can't update tasks that don't exist
when:
  event: pull_request
  has_asana_tasks: false
then:
  update_fields:
    # Error: has_asana_tasks: false cannot have update_fields

# ✅ Correct - update only when tasks exist
when:
  event: pull_request
  has_asana_tasks: true
then:
  update_fields:
    # ...
```

### String instead of boolean

```yaml
# ❌ Wrong - must be boolean
when:
  event: pull_request
  has_asana_tasks: "false"

# ✅ Correct - use true/false (no quotes)
when:
  event: pull_request
  has_asana_tasks: false
```

## See Also

- [create_task](/reference/actions/create-task) - Create new Asana tasks
- [update_fields](/reference/actions/update-fields) - Update existing task fields
- [author](/reference/conditions/author) - Filter by PR author (useful with has_asana_tasks: false)
