# Actions

What rules do when conditions match.

## Overview

Actions define what happens when a rule's conditions match. They appear in the `then` block and perform operations on Asana tasks or GitHub PRs.

```yaml
then:
  attach_pr_to_tasks: true
  update_fields:
    '1234567890': '0987654321'
  mark_complete: true
  post_pr_comment: "Task updated!"
```

## Action Categories

### Update Actions

Modify **existing** Asana tasks (requires `has_asana_tasks: true` - the default):

- **update_fields** - Update custom field values
- **mark_complete** - Mark task(s) complete
- **attach_pr_to_tasks** - Link PR via GitHub integration
- **post_pr_comment** - Post comment to GitHub PR

### Create Actions

Create **new** Asana tasks (requires `has_asana_tasks: false`):

- **create_task** - Create task with metadata and fields

## Mutual Exclusivity

You **cannot** mix create and update actions:

```yaml
# ❌ Invalid - cannot combine create_task with updates
then:
  create_task:
    project: '1234567890'
    # ...
  update_fields:  # ERROR!
    '1111111111': '2222222222'
```

```yaml
# ✅ Valid - only create actions
when:
  has_asana_tasks: false
then:
  create_task:
    project: '1234567890'
    # ...

# ✅ Valid - only update actions
when:
  has_asana_tasks: true
then:
  update_fields:
    '1111111111': '2222222222'
  mark_complete: true
  post_pr_comment: "Done!"
```

## update_fields

Update custom field values on existing tasks.

### Basic Usage

```yaml
then:
  update_fields:
    '1234567890': '0987654321'  # Field GID → Value
    '1111111111': 'High'         # Another field
```

### With Templates

```yaml
then:
  update_fields:
    '1234567890': 'PR #{{pr.number}}'
    '1111111111': '{{pr.author}}'
    '2222222222': '{{extract_from_body "TICKET-\\d+"}}'
```

### Empty Values

Empty template values skip the field update:

```yaml
then:
  update_fields:
    '1234567890': '{{extract_from_body "BUILD-(\\d+)"}}'
    # If pattern doesn't match, returns empty string → field not updated
```

See [update_fields reference](/reference/actions/update-fields).

## mark_complete

Mark task(s) complete.

### Basic Usage

```yaml
then:
  mark_complete: true
```

### With Field Updates

```yaml
then:
  update_fields:
    '1234567890': '0987654321'  # "Shipped"
  mark_complete: true
```

### Multiple Tasks

If PR links multiple Asana tasks, all are marked complete:

```markdown
PR Description:
Fixes https://app.asana.com/0/111/222
Fixes https://app.asana.com/0/111/333
```

Both tasks 222 and 333 are marked complete.

See [mark_complete reference](/reference/actions/mark-complete).

## attach_pr_to_tasks

Link PR to Asana tasks via GitHub integration. **Pull request events only.**

### Basic Usage

```yaml
then:
  attach_pr_to_tasks: true
```

### With Field Updates

```yaml
then:
  attach_pr_to_tasks: true
  update_fields:
    '1234567890': '0987654321'  # Status → "In Review"
```

### Requirements

Requires `integration_secret` input configured:

```yaml
- uses: planningcenter/asana-github-sync@main
  with:
    asana_token: ${{ secrets.ASANA_TOKEN }}
    github_token: ${{ github.token }}
    integration_secret: ${{ secrets.ASANA_INTEGRATION_SECRET }}
```

::: warning PR only
`attach_pr_to_tasks` is not supported for `issues` events. The Asana-GitHub integration is PR-specific. Using it in an issue rule logs a warning and skips the attachment.
:::

Creates integration attachment with live PR status in Asana. Automatically deduplicates.

See [attach_pr_to_tasks reference](/reference/actions/attach-pr-to-tasks).

## post_pr_comment

Post comment to the GitHub PR.

### Basic Usage

```yaml
then:
  post_pr_comment: |
    ✅ Task updated in Asana
```

### With Templates

```yaml
then:
  post_pr_comment: |
    Updated Asana task for {{pr.title}}

    Author: {{pr.author}}
    PR: {{pr.url}}
```

### With Task Context

Special template variables available in comments:

```yaml
then:
  update_fields:
    '1234567890': '0987654321'
  post_pr_comment: |
    ✅ Updated {{summary.total}} task(s)

    {{#each tasks}}
    • {{name}} - {{permalink_url}}
    {{/each}}
```

See [post_pr_comment reference](/reference/actions/post-comment).

## create_task

Create new Asana task (requires `has_asana_tasks: false`). Works for both `pull_request` and `issues` events.

### From a PR

```yaml
when:
  event: pull_request
  has_asana_tasks: false
then:
  create_task:
    project: '1234567890'
    workspace: '0987654321'
    title: '{{pr.title}}'
```

### From a GitHub Issue

```yaml
when:
  event: issues
  action: opened
  has_asana_tasks: false
then:
  create_task:
    project: '1234567890'
    workspace: '0987654321'
    title: 'GH Issue #{{issue.number}}: {{issue.title}}'
    notes: '{{issue.body}}'
```

### Complete (PR)

```yaml
then:
  create_task:
    project: '1234567890'
    workspace: '0987654321'
    section: '1111111111'
    title: '{{clean_title pr.title}}'
    html_notes: |
      <strong>PR:</strong> <a href="{{pr.url}}">{{pr.title}}</a>
      <br><br>
      {{sanitize_markdown pr.body}}
    assignee: '{{map_github_to_asana pr.author}}'
    initial_fields:
      '2222222222': '3333333333'  # Status → "To Do"
```

### Field Formats

- **project, workspace, section:** GID strings (numeric)
- **title:** String (supports templates)
- **notes:** Plain text (supports templates)
- **html_notes:** HTML (supports templates) - mutually exclusive with `notes`
- **assignee:** Asana user GID or "me" (supports templates)
- **initial_fields:** Map of field GID → value (like update_fields)

See [create_task reference](/reference/actions/create-task).

## Combining Actions

### Update + Complete

```yaml
then:
  update_fields:
    '1234567890': '0987654321'  # "Shipped"
  mark_complete: true
```

### Update + Comment

```yaml
then:
  update_fields:
    '1234567890': '0987654321'
  post_pr_comment: |
    ✅ Status updated to "In Review"
```

### All Update Actions

```yaml
then:
  attach_pr_to_tasks: true
  update_fields:
    '1234567890': '0987654321'
  mark_complete: true
  post_pr_comment: "Task completed!"
```

## Action Requirements

Every `then` block must have at least one action:

```yaml
# ❌ Invalid - no actions
then:
  # Nothing here!

# ✅ Valid
then:
  mark_complete: true
```

## Template Evaluation

All action values support Handlebars templates:

```yaml
then:
  update_fields:
    '1234567890': 'PR #{{pr.number}} by {{pr.author}}'
    '1111111111': '{{or pr.assignee pr.author}}'
  post_pr_comment: |
    Updated task {{tasks.0.name}}
```

### Available Context

- **pr.*** - PR data (number, title, body, author, etc.) — `pull_request` events only
- **issue.*** - Issue data (number, title, body, author, etc.) — `issues` events only
- **event.*** - Event data (name, action) — always available
- **label.*** - Label data (when label condition matches)
- **tasks*** - Task data (in post_pr_comment only)
- **summary.*** - Summary data (in post_pr_comment only)
- **Helpers** - clean_title, extract_from_*, map_github_to_asana, etc.

See [Templates](/concepts/templates) for complete guide.

## Validation

Actions are validated:

- **GID format:** Must match `/^\d+$/` (numeric strings)
- **Mutual exclusivity:** Cannot mix create_task with update actions
- **Required fields:** create_task needs project + workspace + title
- **HTML notes:** Cannot use both `notes` and `html_notes`

## Common Patterns

### Status Progression

```yaml
# PR opens
- when:
    event: pull_request
    action: opened
  then:
    update_fields:
      '1111': '2222'  # "In Review"

# PR merges
- when:
    event: pull_request
    action: closed
    merged: true
  then:
    update_fields:
      '1111': '3333'  # "Shipped"
    mark_complete: true
```

### Build Information

```yaml
then:
  update_fields:
    '1111': '{{extract_from_comments "Build #(\\d+)"}}'
    '2222': '{{extract_from_comments "Version: ([\\d.]+)"}}'
  post_pr_comment: |
    ✅ Build info updated
```

### Bot Task Creation

```yaml
when:
  has_asana_tasks: false
  author: [dependabot[bot]]
then:
  create_task:
    project: '1234567890'
    workspace: '0987654321'
    title: '{{clean_title pr.title}}'
    notes: |
      Dependency update from {{pr.author}}
      PR: {{pr.url}}
```

### Conditional Comments

```yaml
then:
  update_fields:
    '1111': '{{extract_from_body "TICKET-(\\d+)"}}'
  post_pr_comment: |
    {{#if (extract_from_body "TICKET-(\\d+)")}}
    ✅ Found ticket: {{extract_from_body "TICKET-(\\d+)"}}
    {{else}}
    ⚠️ No ticket number found in PR description
    {{/if}}
```

## Next Steps

- [create_task](/reference/actions/create-task) - Complete reference
- [update_fields](/reference/actions/update-fields) - Complete reference
- [mark_complete](/reference/actions/mark-complete) - Complete reference
- [attach_pr_to_tasks](/reference/actions/attach-pr-to-tasks) - Complete reference
- [post_pr_comment](/reference/actions/post-comment) - Complete reference
- [Templates](/concepts/templates) - Handlebars guide
