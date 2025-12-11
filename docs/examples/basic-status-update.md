# Basic Status Update

Update an Asana field when a PR opens.

## Use Case

Automatically update a task's Status field to "In Review" when a PR is opened. This is the simplest possible rule - one condition, one action.

## Complete Workflow

```yaml
name: Asana Sync
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
                  event: pull_request      # Triggered by PR events
                  action: opened           # Specifically when opened
                then:
                  update_fields:
                    '1234567890': 'In Review'  # Status field → "In Review"
```

## How It Works

1. **PR Opens** - Developer creates a new PR with Asana task URL in description
2. **Workflow Triggers** - GitHub runs the workflow on `pull_request` event
3. **Action Finds Tasks** - Extracts Asana task URLs from PR description
4. **Field Updates** - Sets Status field (GID `1234567890`) to "In Review"

## Finding Your Field GID

::: tip No Need for Option GIDs!
You only need to find the **field GID** - not the option GIDs. Just use the option name (e.g., `'In Review'`) as the value.
:::

### Using the Asana API

Get your project's custom fields:

```bash
curl "https://app.asana.com/api/1.0/projects/YOUR_PROJECT_GID?opt_fields=custom_field_settings.custom_field" \
  -H "Authorization: Bearer YOUR_ASANA_TOKEN"
```

Look for your Status field in the response:

```json
{
  "custom_field_settings": [
    {
      "custom_field": {
        "gid": "1234567890",  // ← This is your field GID (use as key)
        "name": "Status",
        "enum_options": [
          {
            "name": "In Review"  // ← Use this name as the value
          }
        ]
      }
    }
  ]
}
```

Use the field GID (`1234567890`) as the key and the option name (`In Review`) as the value.

## Expected Behavior

**Before:**
- PR Description: `Fixes https://app.asana.com/0/1111/2222`
- Asana Task Status: "To Do"

**After PR Opens:**
- Asana Task Status: "In Review"

## Variations

### Update Multiple Fields

```yaml
update_fields:
  '1234567890': 'In Review'  # Status → "In Review"
  '1111111111': 'High'        # Priority → "High"
```

### Include Reopened PRs

```yaml
when:
  event: pull_request
  action: [opened, reopened]  # Trigger on both
```

### Match Draft PRs Only

```yaml
when:
  event: pull_request
  action: opened
  draft: true  # Only match draft PRs
```

::: tip
By default (when `draft` is omitted), rules match non-draft PRs only. Use `draft: true` to explicitly match draft PRs.
:::

## Common Issues

### Field Not Updating

**Problem:** Field GID is wrong or option name doesn't match

**Solution:** Verify the field GID using the API and ensure the option name matches exactly (case-sensitive).

```yaml
# ❌ Wrong - using field GID as value
update_fields:
  '1234567890': '1234567890'

# ✅ Correct - using option name as value
update_fields:
  '1234567890': 'In Review'

# ✅ Also correct - using option GID if you prefer
update_fields:
  '1234567890': '0987654321'
```

### No Asana Task Found

**Problem:** PR description doesn't contain Asana URL

**Solution:** Ensure PR description includes an Asana task link:
```
https://app.asana.com/0/PROJECT_GID/TASK_GID
```

### Workflow Not Triggering

**Problem:** Workflow `types` doesn't include `opened`

**Solution:** Check your workflow's `on:` section:

```yaml
on:
  pull_request:
    types: [opened]  # ← Must include 'opened'
```

## Next Steps

- [Mark Complete on Merge](/examples/mark-complete-on-merge) - Add completion when PR merges
- [Bot Task Creation](/examples/bot-task-creation) - Auto-create tasks for dependency PRs
- [Conditions Reference](/reference/conditions/) - All available conditions
- [Actions Reference](/reference/actions/) - All available actions
