# Text Processing Helpers

Clean and format text for Asana tasks.

## Overview

Text processing helpers transform PR content to make it suitable for Asana. This includes removing conventional commit prefixes and cleaning markdown that doesn't render well in Asana.

## Helpers

### clean_title

Remove conventional commit prefixes from PR titles.

**Syntax:**
```handlebars
{{clean_title text}}
```

**Parameters:**
- `text` - The title string to clean

**Returns:** Title with commit prefix removed

**Removes these prefixes:**
- `feat:`, `fix:`, `chore:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`
- Scoped variants: `feat(api):`, `fix(ui):`, etc.

**Example:**
```yaml
create_task:
  title: '{{clean_title pr.title}}'
```

### sanitize_markdown

Clean markdown for Asana's text rendering.

**Syntax:**
```handlebars
{{sanitize_markdown text}}
```

**Parameters:**
- `text` - The markdown text to sanitize

**Returns:** Cleaned text suitable for Asana

**Removes/Cleans:**
- Markdown images (`![alt](url)`)
- Linked images (`[![alt](url)](link)`)
- HTML comments (`[//]: # (comment)`)
- `<details>` tags and content
- Normalizes line endings and whitespace

**Example:**
```yaml
create_task:
  notes: '{{sanitize_markdown pr.body}}'
```

## Examples

### clean_title

#### Basic Prefixes

```handlebars
Input:  "feat: Add user authentication"
Output: "Add user authentication"

Input:  "fix: Resolve login bug"
Output: "Resolve login bug"

Input:  "chore: Update dependencies"
Output: "Update dependencies"
```

#### Scoped Prefixes

```handlebars
Input:  "feat(api): Add user endpoint"
Output: "Add user endpoint"

Input:  "fix(ui): Fix button alignment"
Output: "Fix button alignment"
```

#### No Prefix

```handlebars
Input:  "Update README"
Output: "Update README"
```

### sanitize_markdown

#### Remove Images

```handlebars
Input:  "Check this ![screenshot](url.png)"
Output: "Check this"

Input:  "[![badge](badge.png)](link)"
Output: ""
```

#### Clean HTML

```handlebars
Input:  "Line 1<br>Line 2"
Output: "Line 1\nLine 2"

Input:  "<details>Hidden content</details>"
Output: ""
```

#### Normalize Whitespace

```handlebars
Input:  "Too    many     spaces"
Output: "Too many spaces"

Input:  "Line\r\nWindows\rMac\nUnix"
Output: "Line\nWindows\nMac\nUnix"
```

## Common Use Cases

### Clean Task Titles

Create readable task titles from PR titles:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
      author: 'dependabot[bot]'
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        title: '{{clean_title pr.title}}'
```

**Result:**
- PR Title: `chore(deps): bump lodash from 4.17.19 to 4.17.21`
- Task Title: `bump lodash from 4.17.19 to 4.17.21`

### Combine Both Helpers

Clean title and description together:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        title: '{{clean_title pr.title}}'
        notes: |
          {{sanitize_markdown pr.body}}

          PR: {{pr.url}}
```

### Use in PR Comments

```yaml
rules:
  - when:
      event: pull_request
      action: opened
    then:
      post_pr_comment: |
        Task created: {{clean_title pr.title}}
```

### Preserve Original in HTML Notes

Keep full formatting in HTML:

```yaml
create_task:
  title: '{{clean_title pr.title}}'
  html_notes: |
    <strong>{{pr.title}}</strong>
    <br><br>
    {{sanitize_markdown pr.body}}
```

## Why Use These Helpers?

### clean_title Benefits

**Without clean_title:**
```
Task: "feat(api): Add user authentication endpoint"
```

**With clean_title:**
```
Task: "Add user authentication endpoint"
```

Asana tasks look cleaner without git-specific prefixes.

### sanitize_markdown Benefits

**Markdown issues in Asana:**
- Images don't render (show as broken links)
- `<details>` tags don't work (show raw HTML)
- Inconsistent line endings cause formatting issues
- Extra whitespace looks unprofessional

**After sanitization:**
- Clean text without broken image references
- Proper line breaks
- Consistent formatting
- Professional appearance

## Combining with Other Helpers

### With Extraction

```yaml
title: '{{clean_title pr.title}}'
notes: |
  {{sanitize_markdown pr.body}}

  Version: {{extract_from_body "Version: ([\\d.]+)"}}
```

### With OR

```yaml
title: '{{or (clean_title pr.title) "Untitled PR"}}'
```

### With User Mapping

```yaml
create_task:
  title: '{{clean_title pr.title}}'
  notes: '{{sanitize_markdown pr.body}}'
  assignee: '{{map_github_to_asana pr.author}}'
```

## Edge Cases

### Empty Input

Both helpers handle empty input gracefully:

```handlebars
{{clean_title ""}}        # Returns: ""
{{sanitize_markdown ""}}  # Returns: ""
```

### Already Clean

If text doesn't need cleaning, it's returned unchanged:

```handlebars
{{clean_title "No prefix here"}}  # Returns: "No prefix here"
```

### Multiple Prefixes

Only the first prefix is removed:

```handlebars
Input:  "feat: fix: Something"
Output: "fix: Something"
```

## HTML Notes Alternative

For rich formatting, use `html_notes` instead of `notes`:

```yaml
create_task:
  title: '{{clean_title pr.title}}'
  html_notes: |
    <strong>PR Description</strong>
    <br><br>
    {{sanitize_markdown pr.body}}
    <br><br>
    <a href="{{pr.url}}">View PR #{{pr.number}}</a>
```

This gives you more control over formatting while still cleaning the markdown.

## Performance

Both helpers are fast:
- `clean_title`: Simple regex replacement
- `sanitize_markdown`: Multiple regex passes, but optimized

No noticeable performance impact even with large PR descriptions.

## See Also

- [extract_from_body](/reference/helpers/extraction#extract_from_body) - Extract specific content
- [create_task](/reference/actions/create-task) - Where to use these helpers
- [Context Variables](/reference/context-variables#pr) - PR title and body variables
- [Template System](/concepts/templates) - Handlebars overview
