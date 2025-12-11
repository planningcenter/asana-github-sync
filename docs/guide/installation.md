# Installation

This guide walks you through setting up Asana GitHub Sync in your repository.

## Step 1: Get Your Asana Personal Access Token

1. Go to [Asana Developer Console](https://app.asana.com/0/my-apps)
2. Click **+ Create new token**
3. Give it a descriptive name (e.g., "GitHub Actions - MyRepo")
4. Copy the token (you won't see it again!)
5. Add it to your GitHub repository secrets as `ASANA_TOKEN`:
   - Go to your repo → Settings → Secrets and variables → Actions
   - Click **New repository secret**
   - Name: `ASANA_TOKEN`
   - Value: (paste your token)

::: warning
Keep your token secret! Never commit it to your repository or share it publicly.
:::

## Step 2: Get GitHub Integration Secret (Optional)

The integration secret enables **rich PR attachments** in Asana tasks, showing PR status, checks, reviewers, and more directly in Asana.

::: tip
**This is only needed if you have the [Asana GitHub integration](https://asana.com/apps/github) installed.** Without it, the action will still work perfectly fine - you just won't get rich PR attachments in Asana.
:::

1. Go to the [Asana GitHub Integration Auth page](https://github.integrations.asana.plus/auth?domainId=ghactions)
2. **Authorize the Asana app** when prompted
3. **Authorize the GitHub app** when prompted
4. Copy the generated secret (don't share it!)
5. Add it to your GitHub repository secrets as `ASANA_GITHUB_INTEGRATION_SECRET`:
   - Go to your repo → Settings → Secrets and variables → Actions
   - Click **New repository secret**
   - Name: `ASANA_GITHUB_INTEGRATION_SECRET`
   - Value: (paste your secret)

**Managing tokens:**
- View and revoke tokens at [Manage Tokens](https://github.integrations.asana.plus/auth?domainId=manage_tokens)
- Each repository can have its own token, or you can reuse one across repos

**What you get with integration secret:**
- Rich PR attachments showing status, checks, and reviewers
- Automatic PR state updates in Asana
- Better visibility of PR progress without leaving Asana

## Step 3: Create Workflow File

Create `.github/workflows/asana-sync.yml` in your repository:

```yaml
name: Sync PR to Asana

on:
  pull_request:
    types: [opened, closed, labeled, edited]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: planningcenter/asana-github-sync@main
        with:
          asana_token: ${{ secrets.ASANA_TOKEN }}
          github_token: ${{ github.token }}
          integration_secret: ${{ secrets.ASANA_GITHUB_INTEGRATION_SECRET }}
          rules: |
            rules:
              - when:
                  event: pull_request
                  action: opened
                then:
                  update_fields:
                    'YOUR_FIELD_GID': 'In Review'
```

::: info
If you skipped Step 2, simply omit the `integration_secret` line from your workflow.
:::

## Step 4: Find Your Asana GIDs

Asana uses Global IDs (GIDs) to identify projects, workspaces, custom fields, and field values. Here's how to find them:

### Finding Project and Workspace GIDs

**Method 1: From URL**

Open your Asana project in a browser. The URL looks like:
```
https://app.asana.com/0/1234567890123/list
                        ^^^^^^^^^^^^^ - This is your project GID
```

For workspace GID, use the [Asana API Explorer](https://developers.asana.com/reference/getworkspaces):
1. Go to **Try it** section
2. Click **Send** (authenticates with your account)
3. Find your workspace in the response

**Method 2: Using Browser DevTools**

1. Open your Asana project
2. Open browser DevTools (F12)
3. Go to Console tab
4. Paste this code:
```javascript
// Get project GID
document.querySelector('[data-project-gid]')?.getAttribute('data-project-gid')

// Get workspace GID
document.querySelector('[data-workspace-gid]')?.getAttribute('data-workspace-gid')
```

### Finding Custom Field GIDs

**Using the Asana API:**

1. Go to [Get Project](https://developers.asana.com/reference/getproject) in API docs
2. Click **Try it**
3. Enter your project GID
4. Add `opt_fields=custom_field_settings.custom_field` parameter
5. Click **Send**
6. In the response, look for `custom_field_settings`:

```json
{
  "custom_field_settings": [
    {
      "custom_field": {
        "gid": "1234567890",  // ← This is your field GID
        "name": "Status",
        "resource_subtype": "enum",
        "enum_options": [
          {
            "gid": "1234567891",  // ← Option GID for "To Do"
            "name": "To Do"
          },
          {
            "gid": "1234567892",  // ← Option GID for "In Review"
            "name": "In Review"
          }
        ]
      }
    }
  ]
}
```

::: tip
**For enum fields** (dropdowns), you need both:
- The **field GID** (e.g., `1234567890`)
- The **option GID** for the value you want to set (e.g., `1234567892` for "In Review")

In your rules, use the option GID as the value:
```yaml
update_fields:
  '1234567890': '1234567892'  # Sets Status field to "In Review"
```
:::

### Finding Section GIDs (for task creation)

1. Go to [Get Project Sections](https://developers.asana.com/reference/getsectionsforproject)
2. Click **Try it**
3. Enter your project GID
4. Click **Send**
5. Find the section you want in the response:

```json
{
  "data": [
    {
      "gid": "9876543210",  // ← This is your section GID
      "name": "To Do"
    }
  ]
}
```

## Step 5: Update Your Rules

Replace the placeholder GIDs in your workflow with your actual GIDs:

```yaml
rules: |
  rules:
    - when:
        event: pull_request
        action: opened
      then:
        update_fields:
          '1234567890': '1234567892'  # Your actual field GID and option GID
```

## Step 6: Test It

Before testing with real Asana tasks, we recommend using **dry-run mode** to preview what would happen:

### Option A: Test with Dry-Run Mode (Recommended)

Add `dry_run: true` to your workflow to see what would happen without making any changes:

```yaml
- uses: planningcenter/asana-github-sync@main
  with:
    asana_token: ${{ secrets.ASANA_TOKEN }}
    github_token: ${{ github.token }}
    integration_secret: ${{ secrets.ASANA_GITHUB_INTEGRATION_SECRET }}
    dry_run: true  # ← Test mode enabled
    rules: |
      rules:
        - when:
            event: pull_request
            action: opened
          then:
            update_fields:
              '1234567890': '1234567892'
```

1. Commit and push your workflow file with `dry_run: true`
2. Open a test pull request with an Asana task URL:
   ```markdown
   Fixes https://app.asana.com/0/YOUR_PROJECT/YOUR_TASK
   ```
3. Check the Actions tab to see the dry-run logs:
   ```
   🔍 DRY RUN MODE ENABLED - No changes will be made
   [DRY RUN] Would update task 1234567890:
   [DRY RUN]   - Field 1234567890: 1234567892
   ```
4. Review the logs to confirm your configuration is correct
5. **Remove `dry_run: true`** or set it to `false` to enable real updates

::: tip Why Use Dry-Run?
Dry-run mode lets you:
- Verify your field GIDs are correct
- Test rule conditions match as expected
- Preview task creation without creating test tasks
- Debug configuration issues safely

Once you're confident everything looks right, disable dry-run mode.
:::

### Option B: Test with Real Updates

If you prefer to test with actual Asana updates:

1. Commit and push your workflow file (without `dry_run`)
2. Open a pull request with an Asana task URL in the description:
   ```markdown
   Fixes https://app.asana.com/0/YOUR_PROJECT/YOUR_TASK
   ```
3. Check the Actions tab in your GitHub repo to see the workflow run
4. Verify the Asana task was updated

## Common Patterns

### Multiple Event Types

Trigger on multiple PR events:

```yaml
on:
  pull_request:
    types: [opened, reopened, closed, labeled, synchronize]
```

### Using Secrets

Store sensitive values in GitHub Secrets:

```yaml
with:
  asana_token: ${{ secrets.ASANA_TOKEN }}
  integration_secret: ${{ secrets.ASANA_GITHUB_INTEGRATION_SECRET }}
  user_mappings: |
    github-user: ${{ secrets.ASANA_USER_GID }}
```

### Finding Task URLs

The action looks for Asana task URLs in your PR description:

- `https://app.asana.com/0/PROJECT_GID/TASK_GID`
- `https://app.asana.com/0/0/TASK_GID`
- `https://app.asana.com/0/PROJECT_GID/TASK_GID/f`

Just paste the URL anywhere in your PR description and the action will find it.

## Troubleshooting

### "No Asana tasks found in PR"

Make sure your PR description contains a valid Asana task URL. The action looks for URLs like:
- `https://app.asana.com/0/1234567890/9876543210`

### "Invalid field GID"

Field GIDs must be:
- Numeric strings (e.g., `'1234567890'`)
- Quoted in YAML
- Actual field GIDs, not field names

### "Failed to update field"

For enum fields, make sure you're using the **option GID**, not the option name:
```yaml
# ❌ Wrong - using field name
'1234567890': 'In Review'

# ✅ Correct - using option GID
'1234567890': '1234567892'
```

For text fields, you can use the value directly:
```yaml
'1234567890': 'Any text value'
```

## Next Steps

- [Your First Rule](/guide/your-first-rule) - Step-by-step tutorial
- [Examples](/examples/basic-status-update) - Real-world examples
- [Validation Rules](/reference/validation-rules) - Common configuration errors
