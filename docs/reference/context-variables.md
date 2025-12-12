# Context Variables

Template variables available in Handlebars expressions.

## Overview

Context variables provide access to PR data, event information, and other runtime values. Use these in any template string throughout your rules.

## pr (Pull Request)

Pull request information. Always available in `pull_request` events.

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `pr.number` | number | PR number | `42` |
| `pr.title` | string | PR title | `"Add user auth"` |
| `pr.body` | string | PR description | Full text |
| `pr.author` | string | PR author username | `"octocat"` |
| `pr.assignee` | string? | PR assignee username (optional) | `"reviewer"` |
| `pr.url` | string | PR URL | `https://github.com/...` |
| `pr.merged` | boolean | Whether PR is merged | `true` / `false` |
| `pr.draft` | boolean | Whether PR is draft | `true` / `false` |
| `pr.base_ref` | string | Target branch | `"main"` |
| `pr.head_ref` | string | Source branch | `"feature/auth"` |

### Examples

```yaml
update_fields:
  '1234567890': '{{pr.title}}'
  '1111111111': '{{pr.number}}'

post_pr_comment: |
  PR #{{pr.number}} by @{{pr.author}}
  {{pr.url}}
```

## event

GitHub event information. Always available.

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `event.name` | string | Event name | `"pull_request"` |
| `event.action` | string | Event action | `"opened"` |

### Examples

```yaml
post_pr_comment: |
  Event: {{event.name}} ({{event.action}})
```

## label

Label information. Only available when `action: labeled` or `action: unlabeled`.

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `label.name` | string | Label name | `"ready-for-qa"` |

### Examples

```yaml
post_pr_comment: |
  Label "{{label.name}}" was added
```

## comments

All PR comments concatenated.

::: warning Important
Comments are **only fetched when you use `extract_from_comments`** helper. This is the only time the `comments` variable will be available. The action fetches comments on-demand to avoid unnecessary API calls.
:::

| Variable | Type | Description |
|----------|------|-------------|
| `comments` | string | All comments joined (only when `extract_from_comments` is used) |

### Examples

```yaml
update_fields:
  '1234567890': '{{extract_from_comments "Build #(\\d+)"}}'
  # Using extract_from_comments triggers comment fetching
```

## Using Variables

### Basic Access

```handlebars
{{pr.title}}
{{pr.author}}
{{event.name}}
```

### With Helpers

```handlebars
{{clean_title pr.title}}
{{map_github_to_asana pr.author}}
{{extract_from_body "Version: ([\\d.]+)"}}
```

### In Field Updates

```yaml
update_fields:
  '1234567890': '{{pr.number}}'
  '1111111111': 'PR by {{pr.author}}'
```

### In Task Creation

```yaml
create_task:
  title: '{{pr.title}}'
  notes: '{{pr.body}}'
  assignee: '{{map_github_to_asana pr.author}}'
```

### In PR Comments

```yaml
post_pr_comment: |
  ## PR #{{pr.number}}: {{pr.title}}

  **Author:** @{{pr.author}}
  **Status:** {{#if pr.draft}}Draft{{else}}Ready{{/if}}
  **URL:** {{pr.url}}
```

## Optional Variables

Some variables may not always be present:

### pr.assignee

Only exists if PR has an assignee:

```yaml
# Safe with or helper
create_task:
  assignee: '{{or (map_github_to_asana pr.assignee) (map_github_to_asana pr.author)}}'
```

### label.name

Only present for `labeled`/`unlabeled` actions:

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
    then:
      post_pr_comment: |
        Label added: {{label.name}}
```

### comments

Only present when comments are fetched:

```yaml
update_fields:
  '1234567890': '{{extract_from_comments "Build #(\\d+)"}}'
  # Returns empty if comments not available
```

## Examples by Use Case

### Simple Field Update

```yaml
update_fields:
  '1234567890': 'PR #{{pr.number}}'
```

### Task from PR

```yaml
create_task:
  title: '{{clean_title pr.title}}'
  notes: |
    {{pr.body}}

    PR: {{pr.url}}
  assignee: '{{map_github_to_asana pr.author}}'
```

### Rich PR Comment

```yaml
post_pr_comment: |
  ## ✅ Task Updated

  **PR:** #{{pr.number}} - {{pr.title}}
  **Author:** @{{pr.author}}
  **Branch:** `\{\{pr.head_ref\}\}` → `\{\{pr.base_ref\}\}`
  **Status:** {{#if pr.draft}}Draft{{else}}Ready for Review{{/if}}

  [View PR]({{pr.url}})
```

### Extract Multiple Values

```yaml
update_fields:
  '1111111111': '{{extract_from_body "Version: ([\\d.]+)"}}'
  '2222222222': '{{extract_from_title "\\[(\\w+)\\]"}}'
  '3333333333': '{{pr.number}}'
  '4444444444': '{{pr.author}}'
```

### Conditional Logic

```yaml
create_task:
  title: '{{pr.title}}'
  assignee: '{{or pr.assignee pr.author}}'
  # Uses assignee if set, otherwise author
```

## Escaping

Variables are inserted as-is (no HTML escaping by default).

For special characters in Asana HTML notes:
```yaml
html_notes: |
  Title: {{pr.title}}
  # No escaping needed - Asana handles it
```

## Missing Variables

If a variable doesn't exist, it evaluates to empty string:

```yaml
# If pr.assignee is undefined
'{{pr.assignee}}'  # Returns: ""
```

Use `or` helper for defaults:

```yaml
'{{or pr.assignee "Unassigned"}}'  # Returns: "Unassigned"
```

## Context in Different Actions

### create_task

All variables available:
- `pr.*`, `event.*`, `label.*` (if applicable), `comments` (if available)

### update_fields

All variables available:
- `pr.*`, `event.*`, `label.*`, `comments`

### mark_complete

No template evaluation (boolean value only).

### post_pr_comment

All variables plus task results (if using advanced templates).

## See Also

- [Template Helpers](/reference/helpers/) - Functions for working with variables
- [extract_from_body](/reference/helpers/extraction#extract_from_body) - Extract from pr.body
- [clean_title](/reference/helpers/text-processing#clean_title) - Clean pr.title
- [map_github_to_asana](/reference/helpers/user-mapping) - Map pr.author
- [Template System](/concepts/templates) - Handlebars overview
