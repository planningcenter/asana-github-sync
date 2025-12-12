# post_pr_comment

Post a comment on the GitHub PR.

## Type

`string` (Handlebars template)

## Description

The `post_pr_comment` action posts a comment on the GitHub PR. The comment supports Handlebars templating, allowing you to include dynamic content from the PR context.

This action works with both `has_asana_tasks: true` and `has_asana_tasks: false`, making it the most flexible action.

## Syntax

```yaml
then:
  post_pr_comment: |
    Your comment here

    Can include {{pr.title}} and other variables
```

## Examples

### Simple Notification

Post a basic comment:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': '0987654321'
      post_pr_comment: |
        ✅ Asana task updated to "In Review"
```

### Dynamic Content

Include PR details:

```yaml
rules:
  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      mark_complete: true
      post_pr_comment: |
        ✅ PR #{{pr.number}} merged!

        Asana task marked complete.
        Author: @{{pr.author}}
```

### Conditional Messages

Use helpers for logic:

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: 'build_created'
    then:
      update_fields:
        '1234567890': '0987654321'
      post_pr_comment: |
        🚀 Build created!

        Build #{{extract_from_comments "Build #(\\d+)"}}
        Version: {{or (extract_from_comments "Version: ([\\d.]+)") "Unknown"}}
```

### Missing Task Warning

Prompt for Asana URL:

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

### Task Creation Confirmation

Notify about auto-created tasks:

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
      post_pr_comment: |
        🤖 Automated task created in Asana

        This dependency update has been tracked automatically.
```

### Build Status Updates

Post build information:

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: 'build_created'
    then:
      update_fields:
        '1234567890': '{{extract_from_comments "Build #(\\d+)"}}'
      post_pr_comment: |
        📦 Build Ready

        Build: {{extract_from_comments "Build #(\\d+)"}}
        Version: {{extract_from_comments "Version: ([\\d.]+)"}}

        Asana task updated with build information.
```

### QA Instructions

Provide context for reviewers:

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: 'ready-for-qa'
    then:
      update_fields:
        '1234567890': '0987654321'  # Status → "QA Requested"
      post_pr_comment: |
        ✅ Ready for QA!

        ## Testing Notes

        {{sanitize_markdown pr.body}}

        Asana task updated to "QA Requested".
```

### Multi-line with Formatting

Use markdown in comments:

```yaml
rules:
  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      update_fields:
        '1234567890': '0987654321'
      mark_complete: true
      post_pr_comment: |
        ## ✅ PR Merged!

        **Title**: {{pr.title}}
        **Author**: @{{pr.author}}
        **Branch**: `{{pr.head_ref}}` → `{{pr.base_ref}}`

        Asana task has been marked complete.

        ---

        🤖 Automated by [Asana GitHub Sync]({{pr.url}})
```

## Template Variables

All context variables are available:

| Variable | Description | Example |
|----------|-------------|---------|
| `pr.number` | PR number | `42` |
| `pr.title` | PR title | `"Add feature"` |
| `pr.body` | PR description | Full text |
| `pr.author` | PR author | `"octocat"` |
| `pr.assignee` | PR assignee (if set) | `"reviewer"` |
| `pr.url` | PR URL | `https://github.com/...` |
| `pr.merged` | Merge status | `true` / `false` |
| `pr.draft` | Draft status | `true` / `false` |
| `pr.base_ref` | Target branch | `"main"` |
| `pr.head_ref` | Source branch | `"feature"` |
| `event.name` | Event name | `"pull_request"` |
| `event.action` | Event action | `"opened"` |
| `label.name` | Label name (if labeled) | `"ready-for-qa"` |

## Template Helpers

All helpers work in comments:

| Helper | Purpose | Example |
|--------|---------|---------|
| `extract_from_body` | Extract from PR body | `\{\{extract_from_body "Version: ([\\d.]+)"\}\}` |
| `extract_from_title` | Extract from PR title | `\{\{extract_from_title "\\[(\\w+)\\]"\}\}` |
| `extract_from_comments` | Extract from PR comments | `\{\{extract_from_comments "Build #(\\d+)"\}\}` |
| `clean_title` | Remove commit prefixes | `\{\{clean_title pr.title\}\}` |
| `sanitize_markdown` | Clean markdown for display | `\{\{sanitize_markdown pr.body\}\}` |
| `map_github_to_asana` | Map GitHub user | `\{\{map_github_to_asana pr.author\}\}` |
| `or` | Fallback value | `\{\{or pr.assignee "Unassigned"\}\}` |

## Comment Deduplication

::: tip Automatic Deduplication
The action automatically prevents duplicate comments when workflows re-run. Comments are deduplicated by **exact body match**.
:::

### How It Works

Before posting a comment:
1. Action fetches all existing PR comments
2. Compares new comment body with existing comments
3. If exact match found → skips posting
4. If no match → posts the comment

### Matching Rules

Comments are considered duplicates if the **entire body text matches exactly**:

```yaml
# These are DIFFERENT (both will be posted):
"✅ Task updated"
"✅ Task Updated"  # Different capitalization

# These are DIFFERENT:
"✅ Task updated"
"✅ Task updated "  # Extra space at end

# These are THE SAME (only posted once):
"✅ Task updated"
"✅ Task updated"  # Exact match
```

::: warning Exact Match Only
Even minor differences (whitespace, capitalization, punctuation) will result in a new comment being posted.
:::

### Dynamic Content and Deduplication

If your comment includes dynamic values, each unique value combination creates a new comment:

```yaml
post_pr_comment: |
  ✅ Task updated by {{pr.author}}
```

This will post:
- "✅ Task updated by alice" (first run)
- "✅ Task updated by bob" (different author, new comment)
- "✅ Task updated by alice" (already exists, skipped)

### Best Practices

**Use static messages for notifications:**

```yaml
# ✅ Good - posts once per PR
post_pr_comment: |
  ✅ Asana task updated to "In Review"
```

**Or make dynamic content consistent:**

```yaml
# ✅ Good - predictable deduplication
post_pr_comment: |
  PR #{{pr.number}} is ready for review
```

**Avoid variable timestamps or changing data:**

```yaml
# ❌ Problematic - always posts (timestamp changes)
post_pr_comment: |
  Updated at {{current_time}}

# ❌ Problematic - new comment every time status changes
post_pr_comment: |
  Current status: {{task.status}}
```

## Common Patterns

### Status Update Notification

Let team know task was updated:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      draft: false
    then:
      update_fields:
        '1234567890': '0987654321'
      post_pr_comment: |
        ✅ Asana task updated to "In Review"
```

### Missing Task Prompt

Remind users to add Asana link:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
    then:
      post_pr_comment: |
        ⚠️ No Asana task found!

        Please add the task URL to your PR description.
```

### Completion Confirmation

Confirm work is done:

```yaml
rules:
  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      mark_complete: true
      post_pr_comment: |
        ✅ Merged and deployed! Task marked complete in Asana.
```

### Build Notifications

Share build information:

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: 'build_created'
    then:
      post_pr_comment: |
        📦 Build available!

        Build: {{extract_from_comments "Build #(\\d+)"}}
```

### Summary with Details

Provide comprehensive update:

```yaml
rules:
  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      update_fields:
        '1234567890': '0987654321'
      mark_complete: true
      post_pr_comment: |
        ## 🎉 PR Merged!

        ### Changes
        {{pr.title}}

        ### Updated in Asana
        - Status → "Shipped"
        - Task marked complete

        ### Details
        - Merged from: `{{pr.head_ref}}`
        - Into: `{{pr.base_ref}}`
        - By: @{{pr.author}}
```

## Comment Formatting

### Markdown Support

GitHub comments support markdown:

```yaml
post_pr_comment: |
  ## Heading

  **Bold text**
  *Italic text*

  - Bullet points
  - Work great

  ```code
  Code blocks too
  ```

  [Links](https://example.com)
```

### Emoji

Use emoji for visual clarity:

```yaml
post_pr_comment: |
  ✅ Success
  ⚠️ Warning
  ❌ Error
  🚀 Deployed
  📦 Build
  🤖 Automated
```

### @mentions

Mention GitHub users:

```yaml
post_pr_comment: |
  @{{pr.author}} Your PR has been processed!

  cc: @team-lead
```

## Validation Rules

- **Type**: Must be string
- **Content**: Cannot be empty string
- **Templates**: Fully evaluated before posting
- **Compatibility**: Works with all other actions

## Common Errors

### Empty comment

```yaml
# ❌ Wrong - empty string not allowed
then:
  post_pr_comment: ""

# ✅ Correct - provide content
then:
  post_pr_comment: "Task updated"
```

### Wrong type

```yaml
# ❌ Wrong - must be string
then:
  post_pr_comment: true

# ✅ Correct - use string
then:
  post_pr_comment: "Comment text"
```

### Template errors

```yaml
# ⚠️ Careful - if template fails, comment may be empty
then:
  post_pr_comment: "{{invalid.variable}}"

# ✅ Better - use fallback
then:
  post_pr_comment: "{{or pr.assignee 'No assignee'}}"
```

## When to Use Comments

### ✅ Good Use Cases

- Notify about Asana updates
- Request Asana task URL
- Confirm task completion
- Share extracted metadata
- Provide context to team

### ⚠️ Use Sparingly

- Don't spam every PR action
- Avoid redundant "task updated" messages
- Consider if information is already visible

### ❌ Avoid

- Comments just to prove action ran
- Duplicating GitHub's own notifications
- Information that's in PR description

## See Also

- [Context Variables](/reference/context-variables) - All available variables
- [Template Helpers](/reference/helpers/) - Functions for extraction and formatting
- [sanitize_markdown](/reference/helpers/text-processing#sanitize_markdown) - Clean markdown for display
- [extract_from_comments](/reference/helpers/extraction#extract_from_comments) - Extract from PR comments
