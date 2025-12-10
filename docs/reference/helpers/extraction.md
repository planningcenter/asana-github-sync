# Extraction Helpers

Extract data from PR content using regular expressions.

## Overview

Extraction helpers use regex patterns with capture groups to pull specific data from PR descriptions, titles, or comments. The extracted values can be used in field updates, task creation, or PR comments.

All extraction helpers return the **first capture group** from the regex match, or an empty string if no match is found.

## Helpers

### extract_from_body

Extract data from the PR description (body).

**Syntax:**
```handlebars
{{extract_from_body "pattern"}}
```

**Parameters:**
- `pattern` - Regular expression with a capture group

**Returns:** First capture group value, or empty string

**Example:**
```yaml
update_fields:
  '1234567890': '{{extract_from_body "Version: ([\\d.]+)"}}'
```

### extract_from_title

Extract data from the PR title.

**Syntax:**
```handlebars
{{extract_from_title "pattern"}}
```

**Parameters:**
- `pattern` - Regular expression with a capture group

**Returns:** First capture group value, or empty string

**Example:**
```yaml
update_fields:
  '1234567890': '{{extract_from_title "\\[(\\w+)\\]"}}'
```

### extract_from_comments

Extract data from PR comments.

**Syntax:**
```handlebars
{{extract_from_comments "pattern"}}
```

**Parameters:**
- `pattern` - Regular expression with a capture group

**Returns:** First capture group value, or empty string

**Example:**
```yaml
update_fields:
  '1234567890': '{{extract_from_comments "Build #(\\d+)"}}'
```

::: tip Automatic Comment Fetching
The action **automatically detects** when your rules use `extract_from_comments` and only fetches PR comments when needed. You don't need to configure anything—it's optimized for you.
:::

**How it works:**
1. Action analyzes your rules configuration at startup
2. If any rule contains `extract_from_comments`, comments are fetched
3. If no rule uses it, comments are NOT fetched (saves 1 API call)
4. Comments are fetched once and reused for all rules

::: info Performance Impact
- **Without** `extract_from_comments`: 0 comment API calls
- **With** `extract_from_comments`: 1 comment API call (regardless of how many rules use it)

The optimization happens automatically—you don't need to worry about API efficiency.
:::

## Regex Patterns

### Capture Groups

Use parentheses `()` to define what to extract:

```handlebars
Version: ([\\d.]+)
         ^^^^^^^
         This is captured
```

### Common Patterns

| Pattern | Description | Example Match | Captures |
|---------|-------------|---------------|----------|
| `([\\d.]+)` | Version numbers | `1.2.3` | `1.2.3` |
| `(\\d+)` | Integers | `42` | `42` |
| `\\[(\\w+)\\]` | Bracketed text | `[urgent]` | `urgent` |
| `@(\\w+)` | Username | `@octocat` | `octocat` |
| `#(\\d+)` | Issue/PR number | `#123` | `123` |

### Escaping

In YAML strings, backslashes must be doubled:

```yaml
# ❌ Wrong - single backslash
'\\d+'

# ✅ Correct - double backslash
'\\\\d+'
```

## Examples

### Extract Version Number

From PR body like:
```
Version: 2.1.0
```

```yaml
rules:
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': '{{extract_from_body "Version: ([\\d.]+)"}}'
```

### Extract Category from Title

From PR title like: `[backend] Add user authentication`

```yaml
rules:
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': '{{extract_from_title "\\[(\\w+)\\]"}}'
```

### Extract Build Number from Comments

From comment like: `Build #12345 created`

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: 'build_created'
    then:
      update_fields:
        '1234567890': '{{extract_from_comments "Build #(\\d+)"}}'
```

### Extract Multiple Values

Use multiple extractions:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1111111111': '{{extract_from_body "Version: ([\\d.]+)"}}'
        '2222222222': '{{extract_from_body "Environment: (\\w+)"}}'
        '3333333333': '{{extract_from_title "\\[(\\w+)\\]"}}'
```

### Extract with Fallback

Use with `or` helper for defaults:

```yaml
update_fields:
  '1234567890': '{{or (extract_from_body "Version: ([\\d.]+)") "Unknown"}}'
```

### Complex Patterns

Extract from structured text:

```yaml
# From: "Deployed to: production (v2.1.0)"
update_fields:
  '1234567890': '{{extract_from_comments "Deployed to: (\\w+)"}}'  # "production"
  '1111111111': '{{extract_from_comments "\\(v([\\d.]+)\\)"}}'     # "2.1.0"
```

## Empty Results

If no match is found, extraction returns empty string:

```yaml
# If pattern doesn't match, field update is skipped
update_fields:
  '1234567890': '{{extract_from_body "NotFound: (\\w+)"}}'  # Empty, skipped
```

::: tip
Empty template values skip field updates. This is intentional - you can safely extract without worrying about setting fields to empty strings.
:::

## Common Use Cases

### Dependency Versions

Track dependency update versions:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      author: 'dependabot[bot]'
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        title: '{{pr.title}}'
        initial_fields:
          '1111111111': '{{extract_from_title "from [\\d.]+ to ([\\d.]+)"}}'
```

### Build Numbers

Track CI build numbers:

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: 'build_created'
    then:
      update_fields:
        '1234567890': '{{extract_from_comments "Build: #(\\d+)"}}'
        '1111111111': '{{extract_from_comments "Version: ([\\d.]+)"}}'
```

### Environment Tags

Extract deployment environment:

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: 'deployed'
    then:
      update_fields:
        '1234567890': '{{extract_from_comments "Deployed to (\\w+)"}}'
```

### Issue References

Extract linked issue numbers:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': '{{extract_from_body "Fixes #(\\d+)"}}'
```

## Regex Tips

### Test Your Patterns

Use [regex101.com](https://regex101.com/) to test patterns:
1. Select "JavaScript" flavor
2. Paste your pattern (single backslashes)
3. Test against sample text
4. Double backslashes for YAML

### Common Mistakes

```yaml
# ❌ Wrong - forgot capture group
'Version: \\d+'

# ✅ Correct - added capture group
'Version: (\\d+)'
```

```yaml
# ❌ Wrong - single backslash
'\\d+'

# ✅ Correct - double backslash in YAML
'\\\\d+'
```

```yaml
# ❌ Wrong - greedy match gets too much
'Version: (.+)'

# ✅ Correct - specific pattern
'Version: ([\\d.]+)'
```

## Error Handling

Invalid regex patterns log errors but don't fail the action:

```yaml
# Invalid pattern - logs error, returns empty string
'{{extract_from_body "(?invalid)"}}'
```

Check workflow logs for regex errors.

## Performance

Extractions are cached per template evaluation. Multiple uses of the same extraction don't re-run the regex.

## See Also

- [or Helper](/reference/helpers/utilities#or) - Provide fallback values
- [clean_title](/reference/helpers/text-processing#clean_title) - Remove commit prefixes
- [Context Variables](/reference/context-variables) - Available template variables
- [Template System](/concepts/templates) - Handlebars overview
