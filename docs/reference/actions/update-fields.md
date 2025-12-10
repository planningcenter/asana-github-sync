# update_fields

Update custom field values on existing Asana tasks.

## Type

`Record<string, string>` - Map of field GID to value

## Description

The `update_fields` action updates custom field values on tasks linked in the PR description. This is **only allowed** when `has_asana_tasks: true` (default) or when the PR has Asana task URLs.

Use this to automatically update task status, priorities, or other fields based on PR lifecycle events.

::: warning Critical Requirement
`update_fields` requires `has_asana_tasks: true` (or omit the condition entirely). You cannot update fields when no tasks exist.
:::

## Syntax

```yaml
then:
  update_fields:
    '1234567890': '0987654321'  # Field GID → Value
    '1111111111': 'Text value'  # Text field
    '2222222222': '{{pr.title}}'  # Template value
```

## Field Types

Different field types require different value formats:

| Field Type | Value Format | Example |
|------------|--------------|---------|
| **Enum/Dropdown** | Option GID (quoted) | `'1234567890'` |
| **Text** | Plain text or template | `'In Review'` |
| **Number** | Numeric string | `'42'` |
| **Template** | Handlebars expression | `'{{pr.number}}'` |

::: warning Important: Enum Fields
For enum/dropdown fields, use the **option GID**, not the field name or field GID!
:::

## Examples

### Basic Status Update

Update status field when PR opens:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': '0987654321'  # Status → "In Review"
```

### Multiple Fields

Update several fields at once:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': '0987654321'  # Status → "In Review"
        '1111111111': 'High'         # Priority
        '2222222222': '{{pr.number}}'  # PR Number
```

### Different Updates per Action

Different field values for different events:

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

  # When PR closes without merge
  - when:
      event: pull_request
      action: closed
      merged: false
    then:
      update_fields:
        '1234567890': '3333333333'  # Status → "Cancelled"
```

### Using Templates

Extract values from PR:

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: 'build_created'
    then:
      update_fields:
        '1234567890': '0987654321'  # Status → "Build Ready"
        '1111111111': '{{extract_from_comments "Build #(\\d+)"}}'  # Build number
```

### Label-Based Updates

Change status based on labels:

```yaml
rules:
  # QA label added
  - when:
      event: pull_request
      action: labeled
      label: 'ready-for-qa'
    then:
      update_fields:
        '1234567890': '1111111111'  # Status → "QA Requested"

  # Approved label added
  - when:
      event: pull_request
      action: labeled
      label: 'approved'
    then:
      update_fields:
        '1234567890': '2222222222'  # Status → "Approved"
```

### Conditional Values with Templates

Use helper functions for logic:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': '{{or (extract_from_title "\\[urgent\\]") "Normal"}}'
```

## Field Value Resolution

### Enum/Dropdown Fields

For status, priority, or custom dropdown fields:

1. Find the **field GID** from project settings
2. Find the **option GID** for the specific value
3. Use the **option GID** in your rules

```yaml
# ❌ Wrong - using field name
update_fields:
  'Status': 'In Review'

# ❌ Wrong - using field GID
update_fields:
  '1234567890': 'In Review'

# ✅ Correct - using option GID
update_fields:
  '1234567890': '0987654321'  # Field GID → Option GID
```

### Text Fields

Use plain text or templates:

```yaml
update_fields:
  '1234567890': 'Custom text value'
  '1111111111': 'PR #{{pr.number}}'
  '2222222222': '{{clean_title pr.title}}'
```

### Number Fields

Provide numeric values as strings:

```yaml
update_fields:
  '1234567890': '42'
  '1111111111': '{{pr.number}}'
```

## Template Evaluation

All values support Handlebars templates:

```yaml
update_fields:
  # Extract from PR body
  '1234567890': '{{extract_from_body "Version: ([\\d.]+)"}}'

  # Clean PR title
  '1111111111': '{{clean_title pr.title}}'

  # Map GitHub user to Asana
  '2222222222': '{{map_github_to_asana pr.author}}'

  # Use OR helper for fallback
  '3333333333': '{{or pr.assignee "Unassigned"}}'
```

## Empty Values

::: tip
If a template evaluates to an empty string, that field update is **skipped**. This is intentional behavior.
:::

```yaml
# If pr.assignee is empty, the field won't be updated
update_fields:
  '1234567890': '{{map_github_to_asana pr.assignee}}'
```

## Validation Rules

- **Requires**: `has_asana_tasks: true` (default) or PR must have Asana URLs
- **Field GIDs**: Must be numeric strings (e.g., `'1234567890'`)
- **Values**: Any string (including templates)
- **Empty values**: Skipped (not an error)

## Common Errors

### Using with has_asana_tasks: false

```yaml
# ❌ Wrong - can't update non-existent tasks
when:
  event: pull_request
  has_asana_tasks: false
then:
  update_fields:
    # Error: has_asana_tasks: false cannot have update_fields

# ✅ Correct - use with existing tasks
when:
  event: pull_request
  has_asana_tasks: true  # Or omit
then:
  update_fields:
    '1234567890': '0987654321'
```

### Non-numeric field GIDs

```yaml
# ❌ Wrong - field GID must be numeric
update_fields:
  'Status': 'In Review'
  'abc123': 'Value'

# ✅ Correct - use numeric GIDs
update_fields:
  '1234567890': '0987654321'
  '1111111111': 'Value'
```

### Using field GID instead of option GID for enums

```yaml
# ❌ Wrong - using field GID as value
update_fields:
  '1234567890': '1234567890'  # This is the field GID!

# ✅ Correct - use option GID as value
update_fields:
  '1234567890': '0987654321'  # This is the option GID
```

### Unquoted GIDs

```yaml
# ❌ Wrong - GIDs must be quoted
update_fields:
  1234567890: 0987654321

# ✅ Correct - quote both keys and values
update_fields:
  '1234567890': '0987654321'
```

## Finding Field and Option GIDs

### Using Asana API

Get project custom fields:

```bash
curl "https://app.asana.com/api/1.0/projects/{project_gid}?opt_fields=custom_field_settings.custom_field" \
  -H "Authorization: Bearer YOUR_PAT"
```

This returns:

```json
{
  "custom_field_settings": [
    {
      "custom_field": {
        "gid": "1234567890",  // Field GID (use as key)
        "name": "Status",
        "enum_options": [
          {
            "gid": "0987654321",  // Option GID (use as value)
            "name": "In Review"
          }
        ]
      }
    }
  ]
}
```

### Using Browser DevTools

See [Finding GIDs guide](/guide/installation#step-4-find-your-asana-gids) for detailed instructions.

## Common Patterns

### PR Lifecycle Tracking

Track PR from open to merge:

```yaml
rules:
  # PR opened
  - when:
      event: pull_request
      action: opened
      draft: false
    then:
      update_fields:
        '1234567890': '1111111111'  # Status → "In Review"

  # Changes pushed
  - when:
      event: pull_request
      action: synchronize
    then:
      update_fields:
        '1234567890': '2222222222'  # Status → "Updated"

  # PR merged
  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      update_fields:
        '1234567890': '3333333333'  # Status → "Shipped"
```

### Label-Driven Workflow

Let labels control field values:

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: 'ready-for-qa'
    then:
      update_fields:
        '1234567890': '1111111111'  # Stage → "QA"

  - when:
      event: pull_request
      action: labeled
      label: 'qa-approved'
    then:
      update_fields:
        '1234567890': '2222222222'  # Stage → "Ready"
```

### Extract Metadata

Pull information from PR content:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': '{{extract_from_body "Version: ([\\d.]+)"}}'
        '1111111111': '{{extract_from_title "\\[(\\w+)\\]"}}'
```

## See Also

- [has_asana_tasks](/reference/conditions/has-asana-tasks) - Required condition
- [create_task](/reference/actions/create-task) - Create tasks instead
- [Template Helpers](/reference/helpers/) - Functions for extracting values
- [Context Variables](/reference/context-variables) - Available template variables
- [Finding GIDs](/guide/installation#step-4-find-your-asana-gids) - Detailed guide
