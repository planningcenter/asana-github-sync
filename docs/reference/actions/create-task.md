# create_task

Create a new Asana task from a PR or GitHub issue.

## Type

`CreateTaskAction` object

## Description

The `create_task` action creates a new Asana task with the specified properties. This is **only allowed** when `has_asana_tasks: false` (PR or issue body contains no Asana task URLs).

Use this for automated task creation — bot PRs, human PRs without existing tasks, or GitHub issues that need tracking in Asana.

::: warning Critical Requirement
`create_task` requires `has_asana_tasks: false` in the condition. You cannot create tasks for PRs or issues that already have Asana links.
:::

## Syntax

```yaml
then:
  create_task:
    project: '1234567890'          # Required: Project GID
    workspace: '0987654321'        # Required: Workspace GID
    section: '1111111111'          # Optional: Section GID
    title: '{{pr.title}}'          # Required: Task title (template)
    notes: 'Description here'      # Optional: Plain text notes
    html_notes: '<b>HTML</b>'      # Optional: HTML notes (mutually exclusive with notes)
    assignee: '2222222222'         # Optional: User GID or "me"
    initial_fields:                # Optional: Custom field values
      '3333333333': 'Value'
```

For `issues` events, use `{{issue.*}}` template variables:

```yaml
then:
  create_task:
    project: '1234567890'
    workspace: '0987654321'
    title: 'GH Issue #{{issue.number}}: {{issue.title}}'
    notes: '{{issue.body}}'
```

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `project` | string | Project GID (numeric, quoted) |
| `workspace` | string | Workspace GID (numeric, quoted) |
| `title` | string | Task title (supports templates) |

## Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `section` | string | Section GID for task placement (defaults to project's default section if omitted) |
| `notes` | string | Plain text description (template) |
| `html_notes` | string | HTML formatted description (template) |
| `assignee` | string | User GID, "me", or template |
| `initial_fields` | object | Map of field GID → value (template) |

## Examples

### Task from GitHub Issue

Create an Asana task when a GitHub issue is opened:

```yaml
rules:
  - when:
      event: issues
      action: opened
      has_asana_tasks: false
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        title: 'GH Issue #{{issue.number}}: {{issue.title}}'
        notes: |
          {{issue.body}}

          Reported by: {{issue.author}}
          Issue: {{issue.url}}
```

### Basic Task Creation (PR)

Create task for Dependabot PR:

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

### With Section

Place task in specific section:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
      author: 'renovate[bot]'
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        section: '1111111111'  # "Dependencies" section
        title: '{{clean_title pr.title}}'
```

### With HTML Description

Create rich task with PR link:

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
        html_notes: |
          <strong>Dependency Update</strong>
          <br><br>
          PR: <a href="{{pr.url}}">{{pr.title}}</a>
          <br>
          Author: {{pr.author}}
```

### With User Mapping

Assign to mapped user:

```yaml
# In workflow inputs:
user_mappings: |
  octocat: 1234567890
  dependabot[bot]: 0987654321

rules:
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        title: '{{pr.title}}'
        assignee: '{{map_github_to_asana pr.author}}'
```

### With Initial Custom Fields

Set field values on creation:

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
        title: '{{pr.title}}'
        initial_fields:
          '1111111111': '2222222222'  # Status → "To Do"
          '3333333333': 'Dependencies'  # Category
```

### Complete Example

Full featured task creation:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
      author: ['dependabot[bot]', 'renovate[bot]']
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        section: '1111111111'
        title: '{{clean_title pr.title}}'
        html_notes: |
          <strong>Automated Dependency Update</strong>
          <br><br>
          <a href="{{pr.url}}">View PR #{{pr.number}}</a>
          <br><br>
          {{sanitize_markdown pr.body}}
        assignee: '{{map_github_to_asana pr.author}}'
        initial_fields:
          '2222222222': '3333333333'  # Status → "Review Needed"
          '4444444444': 'Bot PR'       # Type
```

## Important Notes

### Automatic Follower Removal

::: tip
The integration user ('me') is **automatically removed** as a follower after task creation. You don't need to configure this.
:::

### Body Modification and Event Loops

::: warning Important
When a task is created, the action appends the Asana task link to the **PR or issue body**. For PRs this triggers a `pull_request.edited` event; for issues it triggers an `issues.edited` event.
:::

**This can create infinite loops if you're not careful:**

```yaml
# ❌ DANGEROUS - Creates infinite loop!
rules:
  - when:
      event: pull_request
      action: edited  # Fires after task creation appends the link!
      has_asana_tasks: false
    then:
      create_task:
        # Creates task → appends link → triggers edited → creates task → ...

# ❌ DANGEROUS - Same problem for issues
  - when:
      event: issues
      action: edited  # Fires after task creation appends the link!
      has_asana_tasks: false
    then:
      create_task:
        # ...
```

**Safe patterns:**

```yaml
# ✅ Safe - Only creates on 'opened'
rules:
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
    then:
      create_task:
        # ...

  - when:
      event: issues
      action: opened        # 'opened' does not re-fire after body edit
      has_asana_tasks: false
    then:
      create_task:
        # ...
```

**Key insight:** Use `has_asana_tasks: false` only with `action: opened` (or `labeled`, `ready_for_review`) — never with `action: edited`.

### Notes vs HTML Notes

You can only use **one** of:
- `notes` - Plain text description
- `html_notes` - HTML formatted description

Using both will cause a validation error.

### GID Format

All GIDs must be:
- ✅ Numeric strings: `'1234567890'`
- ❌ Not numbers: `1234567890` (will fail validation)
- ❌ Not non-numeric: `'abc123'` (will fail validation)

### Template Evaluation

All string fields support Handlebars templates:
- `title`: `'\{\{clean_title pr.title\}\}'`
- `notes`/`html_notes`: `'\{\{sanitize_markdown pr.body\}\}'`
- `assignee`: `'\{\{map_github_to_asana pr.author\}\}'`
- `initial_fields` values: `'\{\{extract_from_body "Version: ([\\d.]+)"\}\}'`

### Section Placement

The `section` field controls where tasks appear in your Asana project.

**When `section` is specified:**
- Task is placed in the specified section
- Section must exist in the project
- Section GID must be valid (numeric string)

**When `section` is omitted:**
- Task is placed in the project's **default section**
- For list projects: typically the first section or "Untitled section"
- For board projects: typically the first column

::: tip Finding Section GIDs
Use the Asana API or browser DevTools to find section GIDs:

```bash
curl "https://app.asana.com/api/1.0/projects/{project}/sections" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Each section has a `gid` field in the response.
:::

**Example with section:**
```yaml
create_task:
  project: '1234567890'
  workspace: '0987654321'
  section: '1111111111'  # "Dependencies" section
  title: '{{pr.title}}'
```

**Example without section (uses project default):**
```yaml
create_task:
  project: '1234567890'
  workspace: '0987654321'
  # No section specified - goes to project's default
  title: '{{pr.title}}'
```

## Common Patterns

### Bot Task Automation

Standard pattern for dependency bots:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
      author: ['dependabot[bot]', 'renovate[bot]']
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        section: '1111111111'
        title: '{{clean_title pr.title}}'
        html_notes: '<a href="{{pr.url}}">{{pr.title}}</a>'
```

### Extract Version Numbers

Use helpers to extract metadata:

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
        title: '{{pr.title}}'
        initial_fields:
          '1111111111': '{{extract_from_title "to ([\\d.]+)"}}'  # Version
```

## Validation Rules

- **Requires**: `has_asana_tasks: false` in condition
- **Required fields**: `project`, `workspace`, `title`
- **GID format**: Must be numeric strings (e.g., `'1234567890'`)
- **Mutual exclusivity**: Cannot use both `notes` and `html_notes`
- **Empty fields**: `title` cannot be empty string
- **initial_fields**: Field GIDs must be numeric

## Common Errors

### Using without has_asana_tasks: false

```yaml
# ❌ Wrong - requires has_asana_tasks: false
when:
  event: pull_request
  action: opened
  # has_asana_tasks: true (default)
then:
  create_task:
    # Error: create_task requires has_asana_tasks: false

# ✅ Correct
when:
  event: pull_request
  action: opened
  has_asana_tasks: false
then:
  create_task:
    # ...
```

### Missing required fields

```yaml
# ❌ Wrong - missing workspace and title
then:
  create_task:
    project: '1234567890'

# ✅ Correct - all required fields
then:
  create_task:
    project: '1234567890'
    workspace: '0987654321'
    title: '{{pr.title}}'
```

### Non-numeric GIDs

```yaml
# ❌ Wrong - GIDs must be quoted strings
then:
  create_task:
    project: 1234567890
    workspace: 0987654321

# ✅ Correct - quote the GIDs
then:
  create_task:
    project: '1234567890'
    workspace: '0987654321'
```

### Both notes and html_notes

```yaml
# ❌ Wrong - mutually exclusive
then:
  create_task:
    project: '1234567890'
    workspace: '0987654321'
    title: '{{pr.title}}'
    notes: 'Plain text'
    html_notes: '<b>HTML</b>'

# ✅ Correct - use only one
then:
  create_task:
    project: '1234567890'
    workspace: '0987654321'
    title: '{{pr.title}}'
    html_notes: '<b>HTML</b>'
```

### Invalid field GIDs

```yaml
# ❌ Wrong - field GID must be numeric
then:
  create_task:
    project: '1234567890'
    workspace: '0987654321'
    title: '{{pr.title}}'
    initial_fields:
      'status': 'To Do'  # Not a valid GID

# ✅ Correct - use numeric GID
then:
  create_task:
    project: '1234567890'
    workspace: '0987654321'
    title: '{{pr.title}}'
    initial_fields:
      '1111111111': 'To Do'
```

## Finding GIDs

### Project and Workspace GIDs

From Asana URL:
```
https://app.asana.com/0/{workspace}/{project}
                         ^^^^^^^^^^^  ^^^^^^^
```

### Section GID

Use Asana API or browser DevTools:
```bash
curl https://app.asana.com/api/1.0/projects/{project}/sections \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Field GIDs

Get project custom fields:
```bash
curl "https://app.asana.com/api/1.0/projects/{project}?opt_fields=custom_field_settings.custom_field.gid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

For enum fields, you need the **option GID**, not the field GID.

## See Also

- [has_asana_tasks](/reference/conditions/has-asana-tasks) - Required condition for create_task
- [update_fields](/reference/actions/update-fields) - Update existing task fields
- [clean_title](/reference/helpers/text-processing#clean_title) - Remove commit prefixes
- [map_github_to_asana](/reference/helpers/user-mapping) - Map GitHub users to Asana
- [Finding GIDs](/guide/installation#step-4-find-your-asana-gids) - Complete guide
