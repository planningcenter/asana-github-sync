# Text Processing Helpers

Clean and format text for Asana tasks.

## Overview

Text processing helpers transform PR content to make it suitable for Asana. This includes removing conventional commit prefixes, cleaning markdown, and converting markdown to HTML for rich formatting in Asana tasks.

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

### markdown_to_html

Convert markdown to HTML for use in Asana's `html_notes` field.

**Syntax:**
```handlebars
{{markdown_to_html text}}
```

**Parameters:**
- `text` - The markdown text to convert

**Returns:** HTML string suitable for Asana `html_notes`

**Converts:**
- Headings (`#`, `##`) → `<h1>`, `<h2>` (h3–h6 downgraded to `<h2>`)
- Bold/italic/strikethrough → `<strong>`, `<em>`, `<s>`
- Unordered/ordered lists → `<ul>`/`<ol>` with `<li>`
- Links → `<a href="...">`
- Code blocks and inline code → `<pre><code>`, `<code>`
- Blockquotes → `<blockquote>`
- Horizontal rules → `<hr>`
- Tables → `<table>/<tr>/<td>` (normalizes away `<thead>`, `<tbody>`, `<th>`)

**Strips (unsupported by Asana):**
- Images (`![alt](url)` and linked images)
- HTML comments (`[//]: # (...)`)
- Raw HTML tags in the input (e.g. `<script>`, event handler attributes) — only markdown-generated HTML is emitted
- `class` attributes (e.g. syntax highlighting classes)

**Unwraps (tags removed, content preserved):**
- `<details>` / `<summary>` — collapse behavior is lost but the text is kept

**Example:**
```yaml
create_task:
  html_notes: '<body>{{markdown_to_html pr.body}}</body>'
```

::: warning Body wrapper required
Asana requires `html_notes` to be wrapped in `<body>` tags. The helper returns the inner HTML content only — you must wrap it yourself.
:::

---

### sanitize_markdown

Clean markdown for Asana's plain text rendering.

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

### markdown_to_html

#### Headings

h1 and h2 pass through unchanged. h3–h6 are downgraded to h2 since Asana only supports those two levels.

```handlebars
Input:  "# Title"
Output: "<h1>Title</h1>"

Input:  "## Section"
Output: "<h2>Section</h2>"

Input:  "### Subsection"
Output: "<h2>Subsection</h2>"

Input:  "#### Deep"
Output: "<h2>Deep</h2>"
```

#### Inline Formatting

```handlebars
Input:  "**bold** and _italic_"
Output: "<p><strong>bold</strong> and <em>italic</em></p>"

Input:  "~~strikethrough~~"
Output: "<p><s>strikethrough</s></p>"
```

#### Lists

```handlebars
Input:  "- item 1\n- item 2"
Output: "<ul>\n<li>item 1</li>\n<li>item 2</li>\n</ul>"

Input:  "1. first\n2. second"
Output: "<ol>\n<li>first</li>\n<li>second</li>\n</ol>"
```

#### Links

```handlebars
Input:  "[View PR](https://github.com/org/repo/pull/1)"
Output: '<p><a href="https://github.com/org/repo/pull/1">View PR</a></p>'
```

#### Code

The `class` attribute (added by marked for syntax highlighting) is stripped since Asana doesn't use it.

```handlebars
Input:  "`inline code`"
Output: "<p><code>inline code</code></p>"

Input:  "```js\nconsole.log('hi');\n```"
Output: "<pre><code>console.log('hi');\n</code></pre>"
```

#### Tables

`<thead>`, `<tbody>`, and `<th>` are normalized to the subset Asana supports (`<table>`, `<tr>`, `<td>`).

```handlebars
Input:
  | Name  | Status |
  |-------|--------|
  | Auth  | Done   |

Output:
  <table>
  <tr>
  <td>Name</td>
  <td>Status</td>
  </tr>
  <tr>
  <td>Auth</td>
  <td>Done</td>
  </tr>
  </table>
```

#### Images

Images are stripped — Asana's `html_notes` only supports images attached to the task, not external URLs.

```handlebars
Input:  "![screenshot](https://example.com/img.png)"
Output: ""

Input:  "[![badge](https://img.shields.io/badge.svg)](https://example.com)"
Output: ""
```

#### details blocks

The `<details>` and `<summary>` tags are removed but their text content is preserved — collapse behavior is lost but nothing is dropped.

```handlebars
Input:
  <details>
  <summary>Full error log</summary>
  Error: something went wrong at line 42
  </details>

Output:
  <p>Full error log
  Error: something went wrong at line 42</p>
```

#### HTML comments

```handlebars
Input:  "[//]: # (reviewer: please check the auth logic)"
Output: ""
```

#### Empty input

```handlebars
{{markdown_to_html ""}}  # Returns: ""
```

---

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

### Rich HTML Notes from PR Body

Use `markdown_to_html` to get full rich text rendering in Asana:

```yaml
create_task:
  title: '{{clean_title pr.title}}'
  html_notes: '<body>{{markdown_to_html pr.body}}</body>'
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

All helpers handle empty input gracefully:

```handlebars
{{clean_title ""}}         # Returns: ""
{{sanitize_markdown ""}}   # Returns: ""
{{markdown_to_html ""}}    # Returns: ""
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

## notes vs html_notes

Use `notes` with `sanitize_markdown` for plain text, or `html_notes` with `markdown_to_html` for rich formatting:

```yaml
# Plain text — headings and lists show as raw markdown
create_task:
  notes: '{{sanitize_markdown pr.body}}'
```

```yaml
# Rich text — headings, lists, tables, and links render properly in Asana
create_task:
  html_notes: '<body>{{markdown_to_html pr.body}}</body>'
```

You can also mix static HTML with the helper output:

```yaml
create_task:
  html_notes: |
    <body>
    {{markdown_to_html pr.body}}
    <hr/>
    <a href="{{pr.url}}">View PR #{{pr.number}}</a>
    </body>
```

## Performance

All helpers are fast:
- `clean_title`: Single regex replacement
- `sanitize_markdown`: Multiple regex passes, but optimized
- `markdown_to_html`: Markdown parse + regex post-processing; negligible overhead even for large PR descriptions

## See Also

- [extract_from_body](/reference/helpers/extraction#extract_from_body) - Extract specific content
- [create_task](/reference/actions/create-task) - Where to use these helpers
- [Context Variables](/reference/context-variables#pr) - PR title and body variables
- [Template System](/concepts/templates) - Handlebars overview
