# Bot Task Creation

Automatically create Asana tasks for dependency update PRs.

## Use Case

Dependency bots like Dependabot and Renovate create PRs without Asana tasks. Automatically create and track these PRs in Asana by:
1. Detecting bot-authored PRs
2. Creating Asana tasks with cleaned titles
3. Placing them in a specific section

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
                  event: pull_request
                  action: opened
                  has_asana_tasks: false  # No Asana URL in PR description
                  author: [dependabot[bot], renovate[bot]]  # Bot authors only
                then:
                  create_task:
                    project: '1234567890'    # Your project GID
                    workspace: '0987654321'  # Your workspace GID
                    section: '1111111111'    # "Dependencies" section GID
                    title: '{{clean_title pr.title}}'  # Remove "chore(deps):" prefix
                    html_notes: |
                      <strong>Dependency Update</strong>
                      <br><br>
                      PR: <a href="{{pr.url}}">{{pr.title}}</a>
                      <br>
                      Author: {{pr.author}}
```

## How It Works

1. **Bot Opens PR** - Dependabot creates PR without Asana URL
2. **Conditions Match** - `has_asana_tasks: false` + bot author
3. **Task Created** - New Asana task created with cleaned title
4. **PR Updated** - Asana task URL automatically added to PR description

## Key Conditions

### has_asana_tasks: false

**Required** for `create_task`. Only creates tasks when PR has no Asana URL:

```yaml
# ✅ Correct - explicit check
has_asana_tasks: false

# ❌ Wrong - will fail validation
# (default is true, conflicts with create_task)
```

### author Filter

Bot usernames must include `[bot]`:

```yaml
author: [dependabot[bot], renovate[bot]]  # ✅ Correct
```

Not:
```yaml
author: [dependabot, renovate]  # ❌ Wrong - missing [bot]
```

## The clean_title Helper

Removes conventional commit prefixes:

| PR Title | Task Title |
|----------|------------|
| `chore(deps): bump lodash from 4.17.19 to 4.17.21` | `bump lodash from 4.17.19 to 4.17.21` |
| `fix(deps): update dependency react to v18` | `update dependency react to v18` |
| `deps: Update typescript` | `Update typescript` |

## Expected Behavior

**When Dependabot Opens PR:**
- PR Description: (empty - no Asana URL)
- New Asana Task Created:
  - Title: `bump lodash from 4.17.19 to 4.17.21`
  - Section: "Dependencies"
  - Notes: Links to PR
- PR Description Updated: Asana task URL appended

**When Human Opens PR (with Asana URL):**
- No task created (has_asana_tasks is true)

## Variations

### All Bots

Support any bot account:

```yaml
author:
  - dependabot[bot]
  - renovate[bot]
  - github-actions[bot]
  - snyk-bot
```

### With Initial Fields

Set Status field on creation:

```yaml
create_task:
  project: '1234567890'
  workspace: '0987654321'
  title: '{{clean_title pr.title}}'
  initial_fields:
    '2222222222': '3333333333'  # Status → "To Do"
```

### Plain Text Notes

Use `notes` instead of `html_notes`:

```yaml
create_task:
  project: '1234567890'
  workspace: '0987654321'
  title: '{{clean_title pr.title}}'
  notes: |
    Dependency update from {{pr.author}}

    PR: {{pr.url}}
```

### Include PR Body

Add sanitized PR description:

```yaml
html_notes: |
  <strong>{{pr.title}}</strong>
  <br><br>
  {{sanitize_markdown pr.body}}
  <br><br>
  <a href="{{pr.url}}">View PR</a>
```

## Finding Section GIDs

Use the Asana API to get section GIDs:

```bash
curl "https://app.asana.com/api/1.0/projects/YOUR_PROJECT_GID/sections" \
  -H "Authorization: Bearer YOUR_ASANA_TOKEN"
```

Response:
```json
{
  "data": [
    {
      "gid": "1111111111",
      "name": "Dependencies"
    }
  ]
}
```

## Common Issues

### Tasks Created for Human PRs

**Problem:** Missing `has_asana_tasks: false` condition

**Solution:** Always include:

```yaml
when:
  has_asana_tasks: false  # ← Required
  author: [dependabot[bot]]
```

### Validation Error: "create_task requires has_asana_tasks: false"

**Problem:** Condition missing or set to `true`

**Solution:**

```yaml
# ❌ Wrong
when:
  event: pull_request
  # Missing has_asana_tasks!

# ✅ Correct
when:
  event: pull_request
  has_asana_tasks: false
```

### Bot Not Triggering

**Problem:** Bot username incorrect

**Solution:** Check exact GitHub username (including `[bot]`):

```yaml
# Find in PR:
# Author: dependabot[bot]

author: ['dependabot[bot]']  # ✅ Exact match
```

### Task Created But Not in Section

**Problem:** Section GID is wrong or optional

**Solution:** Verify section GID with Asana API. Section is optional but recommended for organization.

## Combining with Updates

Handle both bot PRs (create) and human PRs (update):

```yaml
rules:
  # Create tasks for bots
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
      author: [dependabot[bot]]
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        title: '{{clean_title pr.title}}'

  # Update tasks for humans
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: true  # Explicitly check (or omit, as it's default)
    then:
      update_fields:
        '1234567890': '0987654321'  # Status → "In Review"
```

## Next Steps

- [User-Assigned Tasks](/examples/user-assigned-tasks) - Add automatic assignment
- [has_asana_tasks](/reference/conditions/has-asana-tasks) - Complete reference
- [create_task](/reference/actions/create-task) - All options
- [clean_title](/reference/helpers/text-processing#clean_title) - Helper reference
