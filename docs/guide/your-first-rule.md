# Your First Rule

This tutorial walks you through creating your first automation rule that updates an Asana task's status when a PR opens.

## What We'll Build

We'll create a workflow that:
1. Triggers when a PR is opened
2. Finds Asana task links in the PR description
3. Updates the task's "Status" field to "In Review"

## Prerequisites

Before starting, make sure you have:
- ✅ Asana Personal Access Token in GitHub Secrets as `ASANA_TOKEN`
- ✅ An Asana project with a "Status" custom field
- ✅ The GIDs for your field and field value

::: tip
If you haven't found your GIDs yet, see the [Installation Guide](/guide/installation#step-3-find-your-asana-gids) for detailed instructions.
:::

## Step 1: Create the Workflow File

Create `.github/workflows/asana-sync.yml`:

```yaml
name: Sync PR to Asana

on:
  pull_request:
    types: [opened]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: planningcenter/asana-github-sync@main
        with:
          asana_token: ${{ secrets.ASANA_TOKEN }}
          github_token: ${{ github.token }}
          rules: |
            rules:
              - when:
                  event: pull_request
                  action: opened
                then:
                  update_fields:
                    'YOUR_FIELD_GID': 'YOUR_OPTION_GID'
```

## Step 2: Understanding the Rule Structure

Let's break down what each part does:

### The `when` Block (Conditions)

```yaml
when:
  event: pull_request    # GitHub event name
  action: opened         # Specific action within that event
```

This rule matches when:
- A `pull_request` event occurs
- The specific action is `opened` (not closed, edited, etc.)

All conditions in `when` must match (AND logic).

### The `then` Block (Actions)

```yaml
then:
  update_fields:
    'YOUR_FIELD_GID': 'YOUR_OPTION_GID'
```

When conditions match, the action:
- Updates custom field with GID `YOUR_FIELD_GID`
- Sets it to the option with GID `YOUR_OPTION_GID`

## Step 3: Replace Placeholder GIDs

Let's say you have:
- **Field GID**: `1234567890` (Status field)
- **Option GID**: `1234567892` (In Review option)

Update your rule:

```yaml
rules: |
  rules:
    - when:
        event: pull_request
        action: opened
      then:
        update_fields:
          '1234567890': '1234567892'
```

::: warning
GIDs must be:
- Quoted as strings (e.g., `'1234567890'`)
- Numeric only (no letters or special characters)
:::

## Step 4: Commit and Push

1. Save the file
2. Commit to your repository:
   ```bash
   git add .github/workflows/asana-sync.yml
   git commit -m "Add Asana GitHub sync workflow"
   git push
   ```

## Step 5: Test Your Rule

1. **Create a test PR** with an Asana task URL in the description:

   ```markdown
   ## What changed
   Fixed the login button styling

   ## Asana Task
   https://app.asana.com/0/1234567890/9876543210
   ```

2. **Watch the workflow run**:
   - Go to your repo's **Actions** tab
   - Find the "Sync PR to Asana" workflow
   - Click on the run to see logs

3. **Verify in Asana**:
   - Open the linked task
   - Check that the Status field changed to "In Review"

## What Just Happened?

Here's the full flow:

```
PR Opened
    ↓
GitHub triggers workflow
    ↓
Action reads PR description
    ↓
Finds Asana URL: https://app.asana.com/0/.../TASK_GID
    ↓
Evaluates rules against event
    ↓
Rule matches: event=pull_request, action=opened
    ↓
Executes action: update_fields
    ↓
Calls Asana API to update field
    ↓
Task updated! ✅
```

## Expanding Your Rule

Now that you have a working rule, let's make it more useful.

### Add More Actions

Update multiple fields at once:

```yaml
- when:
    event: pull_request
    action: opened
  then:
    update_fields:
      '1234567890': '1234567892'  # Status → In Review
      '1111111111': '{{pr.author}}' # Reviewer → PR author
    post_pr_comment: |
      ✅ Asana task updated to "In Review"
```

### Add More Conditions

Only trigger for specific authors:

```yaml
- when:
    event: pull_request
    action: opened
    author: [octocat, dependabot[bot]]
  then:
    update_fields:
      '1234567890': '1234567892'
```

### Handle PR Closing

Add a second rule for when PRs merge:

```yaml
rules:
  # When PR opens
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': '1234567892'  # Status → In Review

  # When PR merges
  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      update_fields:
        '1234567890': '1234567899'  # Status → Shipped
      mark_complete: true
```

## Common Patterns

### Update on Label

Trigger when a specific label is added:

```yaml
on:
  pull_request:
    types: [labeled]

# In rules:
- when:
    event: pull_request
    action: labeled
    label: 'ready-for-qa'
  then:
    update_fields:
      '1234567890': '1234567893'  # Status → QA Requested
```

### Skip Draft PRs

Only update for non-draft PRs:

```yaml
- when:
    event: pull_request
    action: opened
    draft: false
  then:
    update_fields:
      '1234567890': '1234567892'
```

### Dynamic Values with Templates

Use PR data in field values:

```yaml
update_fields:
  '1111111111': 'PR #{{pr.number}}: {{pr.title}}'
  '2222222222': '{{pr.author}}'
```

## Debugging Tips

### Check Workflow Logs

If something doesn't work:
1. Go to **Actions** tab
2. Click the failed run
3. Expand the "Sync PR to Asana" step
4. Look for error messages

### Common Issues

**"No Asana tasks found"**
- Make sure your PR description has a valid Asana URL
- Format: `https://app.asana.com/0/PROJECT/TASK`

**"Invalid field GID"**
- GIDs must be quoted strings: `'1234567890'`
- Must be numeric only
- Check you copied the correct GID from Asana API

**"Unauthorized"**
- Verify `ASANA_TOKEN` secret is set correctly
- Check token has access to the project

**"Field update failed"**
- For enum fields, use option GID, not option name
- Verify the option GID exists in that field

## Next Steps

Now that you have a working rule, explore more advanced features:

- [**Examples**](/examples/basic-status-update) - Real-world automation patterns
- [**Conditions Reference**](/reference/conditions/event) - All available conditions
- [**Actions Reference**](/reference/actions/update-fields) - All available actions
- [**Template Helpers**](/reference/helpers/extraction) - Dynamic content generation

## Quick Reference

### Rule Structure

```yaml
rules:
  - when:
      event: string          # Required
      action: string|array   # Optional
      merged: boolean        # Optional
      draft: boolean         # Optional
      label: string          # Optional
      author: string|array   # Optional
      has_asana_tasks: bool  # Optional (default: true)
    then:
      update_fields:         # Optional
        'field_gid': 'value'
      mark_complete: bool    # Optional
      post_pr_comment: str   # Optional
```

### Common Field Types

**Enum/Dropdown fields:**
```yaml
'1234567890': '1234567892'  # Use option GID
```

**Text fields:**
```yaml
'1234567890': 'Any text value'
'1234567890': '{{pr.title}}'  # With template
```

**Number fields:**
```yaml
'1234567890': '42'
'1234567890': '{{extract_from_body "Build #(\\d+)"}}'
```
