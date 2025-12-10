# Utility Helpers

General-purpose template helpers.

## Overview

Utility helpers provide common logic for templates, like fallback values and conditional expressions.

## or

Return the first truthy value from a list of arguments.

**Syntax:**
```handlebars
{{or value1 value2 value3 ...}}
```

**Parameters:**
- `value1, value2, ...` - Any number of values to check

**Returns:** First truthy value, or empty string if all are falsy

**Falsy values:**
- Empty string `""`
- `null`
- `undefined`
- `false`
- `0`

## Examples

### Basic Fallback

```handlebars
{{or pr.assignee "Unassigned"}}
```

If `pr.assignee` is empty, returns `"Unassigned"`.

### Multiple Fallbacks

```handlebars
{{or pr.assignee pr.author "Default User"}}
```

Tries `pr.assignee`, then `pr.author`, then `"Default User"`.

### With Extraction

```handlebars
{{or (extract_from_body "Version: ([\\d.]+)") "Unknown"}}
```

If extraction returns empty, use `"Unknown"`.

### With User Mapping

```handlebars
{{or (map_github_to_asana pr.author) "1234567890"}}
```

If mapping fails, use fallback GID.

## Common Use Cases

### Default Task Assignee

```yaml
create_task:
  assignee: '{{or (map_github_to_asana pr.author) "1234567890"}}'
```

Assign to mapped user, or default to specific GID.

### Default Field Values

```yaml
update_fields:
  '1234567890': '{{or (extract_from_body "Priority: (\\w+)") "Normal"}}'
```

Extract priority, or use "Normal" if not found.

### Chaining Multiple Sources

```yaml
update_fields:
  '1234567890': '{{or (extract_from_title "\\[(\\w+)\\]") (extract_from_body "Category: (\\w+)") "Uncategorized"}}'
```

Try title first, then body, then default.

### PR Comment Fallbacks

```yaml
post_pr_comment: |
  Assigned to: {{or (map_github_to_asana pr.assignee) "No one yet"}}
```

### Complex Logic

```yaml
create_task:
  title: '{{or (clean_title pr.title) pr.title "Untitled PR"}}'
```

Use cleaned title, or original title, or default.

## Behavior

### Empty Strings

Empty strings are falsy:

```handlebars
{{or "" "Fallback"}}
# Returns: "Fallback"
```

### Zero

Zero is falsy:

```handlebars
{{or 0 "Fallback"}}
# Returns: "Fallback"
```

### All Empty

If all values are falsy, returns empty string:

```handlebars
{{or "" null undefined}}
# Returns: ""
```

### Short-Circuit Evaluation

Stops at first truthy value:

```handlebars
{{or "First" "Second"}}
# Returns: "First"
# "Second" never evaluated
```

## Practical Examples

### Version with Fallback

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: 'build_created'
    then:
      update_fields:
        '1234567890': '{{or (extract_from_comments "Version: ([\\d.]+)") "dev"}}'
```

### Assignee Cascade

```yaml
create_task:
  assignee: '{{or (map_github_to_asana pr.assignee) (map_github_to_asana pr.author) "1234567890"}}'
```

Priority:
1. PR assignee (if mapped)
2. PR author (if mapped)
3. Default GID

### Category Detection

```yaml
update_fields:
  '1234567890': '{{or (extract_from_title "\\[(\\w+)\\]") (extract_from_body "Category: (\\w+)") "General"}}'
```

Checks title, then body, then defaults.

### Build Information

```yaml
update_fields:
  '1111111111': '{{or (extract_from_comments "Build #(\\d+)") "Pending"}}'
  '2222222222': '{{or (extract_from_comments "Environment: (\\w+)") "staging"}}'
```

### Task Title Safety

```yaml
create_task:
  title: '{{or (clean_title pr.title) "PR Update"}}'
```

Ensures title is never empty.

## Combining with Other Helpers

### Extraction + OR

```yaml
'{{or (extract_from_body "Pattern: (\\w+)") "default"}}'
```

### Mapping + OR

```yaml
'{{or (map_github_to_asana pr.author) "me"}}'
```

### Clean + OR

```yaml
'{{or (clean_title pr.title) pr.title}}'
```

### Multiple Helpers

```yaml
'{{or (extract_from_body "Version: ([\\d.]+)") (extract_from_title "v([\\d.]+)") "1.0.0"}}'
```

## Empty Field Updates

Remember: empty template values skip field updates:

```yaml
# If all values are empty, field update is skipped
update_fields:
  '1234567890': '{{or (extract_from_body "NotFound") (extract_from_title "AlsoNotFound")}}'
```

This is useful for optional fields.

## Debugging

Use in PR comments to see what value is used:

```yaml
post_pr_comment: |
  Debug:
  - PR Assignee: {{pr.assignee}}
  - PR Author: {{pr.author}}
  - Chosen: {{or pr.assignee pr.author "None"}}
```

## Comparison with Other Languages

Similar to:
- JavaScript: `a || b || c`
- Python: `a or b or c`
- Ruby: `a || b || c`

But returns empty string instead of `false` or `null`.

## Limitations

### No NOT operator

Can't check for "not empty":

```handlebars
# ❌ Can't do this
{{if-not-empty pr.assignee}}
```

Instead, use conditional rules at the workflow level.

### No AND operator

Can't check if multiple values are truthy:

```handlebars
# ❌ Can't do this
{{and pr.assignee pr.author}}
```

Use separate extractions if needed.

### No Complex Logic

For complex logic, use multiple rules:

```yaml
rules:
  # Rule 1: When assignee exists
  - when:
      event: pull_request
      # Check conditions here
    then:
      # Use pr.assignee

  # Rule 2: When no assignee
  - when:
      event: pull_request
      # Different conditions
    then:
      # Use pr.author
```

## Performance

The `or` helper is very fast - just checks truthiness. No performance concerns even with many arguments.

## See Also

- [extract_from_body](/reference/helpers/extraction#extract_from_body) - Often used with or
- [map_github_to_asana](/reference/helpers/user-mapping) - Common or use case
- [Context Variables](/reference/context-variables) - Available variables
- [Template System](/concepts/templates) - Handlebars overview
