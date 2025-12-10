# Templates

Dynamic values using Handlebars templating.

## Overview

Templates let you insert dynamic PR data into action values. They use Handlebars syntax with custom helpers for text processing, extraction, and user mapping.

```yaml
then:
  update_fields:
    '1234567890': 'PR #{{pr.number}}: {{pr.title}}'
    '1111111111': '{{pr.author}}'
```

## Basic Syntax

### Variable Interpolation

```handlebars
{{variable}}
```

```yaml
title: '{{pr.title}}'
# Result: "Add user authentication"

notes: 'PR by {{pr.author}}'
# Result: "PR by octocat"
```

### Nested Properties

```handlebars
{{object.property}}
```

```yaml
notes: 'Event: {{event.name}} - {{event.action}}'
# Result: "Event: pull_request - opened"
```

## Context Variables

### PR Data

Available in all templates:

```handlebars
{{pr.number}}      # 123
{{pr.title}}       # "Add user authentication"
{{pr.body}}        # Full PR description
{{pr.author}}      # "octocat"
{{pr.assignee}}    # "alice" (or empty if unassigned)
{{pr.url}}         # "https://github.com/..."
{{pr.merged}}      # true or false
{{pr.draft}}       # true or false
{{pr.base_ref}}    # "main"
{{pr.head_ref}}    # "feature-branch"
```

### Event Data

```handlebars
{{event.name}}     # "pull_request"
{{event.action}}   # "opened"
```

### Label Data

Only available when `label` condition matches:

```handlebars
{{label.name}}     # "ready-for-qa"
```

### Task Data

Only available in `post_pr_comment`:

```handlebars
{{summary.total}}  # Number of tasks updated

{{#each tasks}}
  {{name}}          # Task name
  {{permalink_url}} # Task URL
  {{gid}}           # Task GID
{{/each}}
```

See [Context Variables reference](/reference/context-variables).

## Handlebars Helpers

### Text Processing

#### clean_title

Remove conventional commit prefixes:

```handlebars
{{clean_title pr.title}}
```

```yaml
# Input: "feat: Add dark mode"
# Output: "Add dark mode"

# Input: "chore(deps): bump lodash"
# Output: "bump lodash"
```

See [clean_title reference](/reference/helpers/text-processing#clean_title).

#### sanitize_markdown

Convert markdown to Asana-safe HTML:

```handlebars
{{sanitize_markdown pr.body}}
```

Handles: headers, lists, code blocks, links, images.

See [sanitize_markdown reference](/reference/helpers/text-processing#sanitize_markdown).

### Extraction

#### extract_from_body

Extract text from PR body using regex:

```handlebars
{{extract_from_body "TICKET-(\\d+)"}}
```

```yaml
# PR body: "Fixes TICKET-1234"
# Result: "1234"
```

Returns first capture group or empty string.

See [extract_from_body reference](/reference/helpers/extraction#extract_from_body).

#### extract_from_title

Extract from PR title:

```handlebars
{{extract_from_title "\\[([A-Z]+)\\]"}}
```

```yaml
# PR title: "[URGENT] Fix auth bug"
# Result: "URGENT"
```

See [extract_from_title reference](/reference/helpers/extraction#extract_from_title).

#### extract_from_comments

Extract from PR comments:

```handlebars
{{extract_from_comments "Build #(\\d+)"}}
```

```yaml
# Comment: "Build #12345 completed"
# Result: "12345"
```

::: warning Comment Fetching
Using this helper **automatically fetches PR comments** via GitHub API. This is the only time comments are fetched to avoid unnecessary API calls.
:::

See [extract_from_comments reference](/reference/helpers/extraction#extract_from_comments).

### User Mapping

#### map_github_to_asana

Map GitHub username to Asana user GID:

```handlebars
{{map_github_to_asana pr.author}}
```

Requires `user_mappings` input:

```yaml
user_mappings: |
  octocat: 1234567890
  alice: 0987654321
```

Returns empty string if not mapped.

See [map_github_to_asana reference](/reference/helpers/user-mapping).

### Utilities

#### or

Logical OR / fallback values:

```handlebars
{{or value1 value2 value3}}
```

Returns first truthy value:

```yaml
assignee: '{{or pr.assignee pr.author}}'
# If pr.assignee exists, use it
# Otherwise use pr.author
```

```yaml
field: '{{or (extract_from_body "TICKET-\\d+") "No ticket"}}'
# If extraction succeeds, use it
# Otherwise use "No ticket"
```

See [or helper reference](/reference/helpers/utilities).

## Block Helpers

### #if / #unless

Conditional content:

```handlebars
{{#if pr.assignee}}
Assigned to: {{pr.assignee}}
{{else}}
Unassigned
{{/if}}
```

```handlebars
{{#unless pr.draft}}
Ready for review
{{/unless}}
```

### #each

Iterate over arrays (mainly for `tasks` in comments):

```handlebars
{{#each tasks}}
• {{name}} - {{permalink_url}}
{{/each}}
```

## Common Patterns

### Task Titles

```yaml
title: '{{clean_title pr.title}}'
# Clean commit prefixes

title: '{{pr.title}} #{{pr.number}}'
# Include PR number

title: '{{extract_from_title "\\[([A-Z]+)\\]"}} {{clean_title pr.title}}'
# Extract tag + clean title
```

### Task Notes

```yaml
notes: |
  PR: {{pr.url}}
  Author: {{pr.author}}
  {{#if pr.assignee}}Assignee: {{pr.assignee}}{{/if}}
```

```yaml
html_notes: |
  <strong>PR:</strong> <a href="{{pr.url}}">{{pr.title}}</a>
  <br><br>
  {{sanitize_markdown pr.body}}
```

### Field Values

```yaml
update_fields:
  # Author
  '1111': '{{pr.author}}'

  # Ticket number
  '2222': '{{extract_from_body "TICKET-(\\d+)"}}'

  # Build number
  '3333': '{{extract_from_comments "Build #(\\d+)"}}'

  # PR link
  '4444': '{{pr.url}}'
```

### Assignment

```yaml
# Prefer assignee, fallback to author
assignee: '{{or (map_github_to_asana pr.assignee) (map_github_to_asana pr.author)}}'

# Map author with default
assignee: '{{or (map_github_to_asana pr.author) "1234567890"}}'

# Just author
assignee: '{{map_github_to_asana pr.author}}'
```

### PR Comments

```yaml
post_pr_comment: |
  ✅ Updated {{summary.total}} Asana task{{#unless (eq summary.total 1)}}s{{/unless}}

  {{#each tasks}}
  • [{{name}}]({{permalink_url}})
  {{/each}}

  PR: {{pr.title}} by {{pr.author}}
```

### Conditional Updates

```yaml
update_fields:
  '1111': '{{extract_from_body "BUILD-(\\d+)"}}'
  # If pattern doesn't match, returns empty string
  # Empty values skip field update automatically
```

### Complex Extraction

```yaml
update_fields:
  # Extract version
  '1111': '{{extract_from_comments "Version: ([\\d.]+)"}}'

  # Extract and format
  '2222': 'Build {{extract_from_comments "Build #(\\d+)"}} (firebase)'

  # Multiple extractions
  '3333': '{{extract_from_body "ENV: (\\w+)"}} - {{extract_from_body "REGION: (\\w+)"}}'
```

## Template Evaluation

Templates are evaluated when:
1. PR data is loaded
2. Asana tasks are found (if `has_asana_tasks: true`)
3. Comments are fetched (if `extract_from_comments` used)

### Empty Values

Empty template results:
- **update_fields:** Field update skipped
- **create_task fields:** Empty string used
- **Titles/notes:** Empty string used (might fail validation)

```yaml
update_fields:
  '1111': '{{extract_from_body "TICKET-(\\d+)"}}'
  # No match → empty string → field not updated ✓

create_task:
  title: '{{extract_from_body "TICKET-(\\d+)"}}'
  # No match → empty string → validation error ✗
```

## Escaping

Handlebars is configured with `noEscape: true` - no HTML escaping:

```yaml
html_notes: '<strong>{{pr.title}}</strong>'
# Output: <strong>Add feature</strong>
# NOT: &lt;strong&gt;Add feature&lt;/strong&gt;
```

## Debugging

Use `post_pr_comment` to debug template values:

```yaml
then:
  post_pr_comment: |
    Debug:
    - pr.author: "{{pr.author}}"
    - pr.assignee: "{{pr.assignee}}"
    - Mapped: "{{map_github_to_asana pr.author}}"
    - Extracted: "{{extract_from_body "TICKET-(\\d+)"}}"
```

## Validation

Templates are validated:
- Syntax errors fail rule validation
- Missing variables return empty strings (no errors)
- Helper errors return empty strings and log warnings

## Next Steps

- [Context Variables](/reference/context-variables) - All available variables
- [Extraction Helpers](/reference/helpers/extraction) - Pattern extraction
- [Text Processing](/reference/helpers/text-processing) - Text manipulation
- [User Mapping](/reference/helpers/user-mapping) - GitHub to Asana mapping
- [Utilities](/reference/helpers/utilities) - OR helper and more
