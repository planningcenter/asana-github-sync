# User-Assigned Tasks

Create tasks with automatic assignment based on PR author.

## Use Case

Building on [Bot Task Creation](/examples/bot-task-creation), automatically assign created tasks to the right team member using GitHub→Asana user mappings. This ensures:
1. Tasks are created for PRs without Asana links
2. Tasks are automatically assigned to the correct person
3. Bot PRs route to specific team members

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
          # Map GitHub usernames to Asana user GIDs
          user_mappings: |
            octocat: 1234567890
            alice: 0987654321
            bob: 1111111111
            dependabot[bot]: 2222222222
            renovate[bot]: 2222222222
          rules: |
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
                    html_notes: '<a href="{{pr.url}}">{{pr.title}}</a>'
                    # Try PR assignee first, fallback to author
                    assignee: '{{or (map_github_to_asana pr.assignee) (map_github_to_asana pr.author)}}'
```

## How It Works

### For PRs with Assignee
1. PR opened by `octocat`, assigned to `alice`
2. Task created and assigned to Alice (Asana GID `0987654321`)

### For PRs without Assignee
1. PR opened by `bob`, no assignee
2. Task created and assigned to Bob (Asana GID `1111111111`)

### For Bot PRs
1. Dependabot opens PR
2. Task created and assigned to mapped team member (GID `2222222222`)

### For Unmapped Users
1. PR opened by `charlie` (not in mappings)
2. Task created without assignee (mapping returns empty string)

## Key Components

### user_mappings Input

Maps GitHub usernames to Asana user GIDs:

```yaml
user_mappings: |
  github_username: asana_user_gid
  octocat: 1234567890
```

**Format:**
- GitHub username (exact, case-sensitive)
- Bot usernames include `[bot]`
- Asana user GID (numeric)

### map_github_to_asana Helper

Looks up the mapping:

```handlebars
{{map_github_to_asana "octocat"}}  # Returns: "1234567890"
{{map_github_to_asana "unknown"}}  # Returns: "" (empty)
```

### or Helper

Provides fallback logic:

```handlebars
{{or value1 value2 value3}}
# Returns first truthy value
```

## Assignment Priority

```yaml
assignee: '{{or (map_github_to_asana pr.assignee) (map_github_to_asana pr.author)}}'
```

1. Try PR assignee first
2. If no assignee (or not mapped), use PR author
3. If author not mapped, no assignment (empty string)

## Finding Asana User GIDs

### Method 1: User Tasks URL

When viewing a user's tasks:
```
https://app.asana.com/0/my_tasks/1234567890/list
                                ^^^^^^^^^^
                                User GID
```

### Method 2: Asana API

```bash
curl "https://app.asana.com/api/1.0/workspaces/YOUR_WORKSPACE/users" \
  -H "Authorization: Bearer YOUR_ASANA_TOKEN"
```

Response:
```json
{
  "data": [
    {
      "gid": "1234567890",
      "name": "Alice Smith",
      "email": "alice@example.com"
    }
  ]
}
```

## Variations

### Assign to Self

Use "me" instead of GID:

```yaml
assignee: 'me'
```

### Default Assignee

Provide fallback GID:

```yaml
assignee: '{{or (map_github_to_asana pr.author) "9999999999"}}'
# If author not mapped, assign to GID 9999999999
```

### Only Assign if Mapped

Let tasks be unassigned if no mapping:

```yaml
assignee: '{{map_github_to_asana pr.author}}'
# Empty string = no assignment
```

### Different Mappings for Bots

Route different bots to different people:

```yaml
user_mappings: |
  dependabot[bot]: 1234567890  # Backend team
  renovate[bot]: 0987654321    # Frontend team
  snyk-bot: 1111111111        # Security team
```

## Expected Behavior

**PR by octocat (mapped to 1234567890):**
- Task Created ✅
- Task Assigned to: User 1234567890

**PR by charlie (not mapped):**
- Task Created ✅
- Task Assigned to: (none)

**PR by octocat, assigned to alice:**
- Task Created ✅
- Task Assigned to: alice (0987654321)

## Common Issues

### Task Created But Not Assigned

**Problem:** User not in `user_mappings`

**Solution:** Add mapping:

```yaml
user_mappings: |
  username: their_asana_gid
```

### Wrong Person Assigned

**Problem:** GID is incorrect

**Solution:** Verify user GID with Asana API (see above).

### Bot Username Mismatch

**Problem:** Bot username in mapping doesn't match GitHub

**Solution:** Check exact format:

```yaml
# GitHub shows: dependabot[bot]
user_mappings: |
  dependabot[bot]: 1234567890  # ✅ Exact match
```

### Case Sensitivity

**Problem:** Mapping uses different case than GitHub

**Solution:** Match GitHub's exact username:

```yaml
# GitHub username: octocat (lowercase)
user_mappings: |
  octocat: 1234567890  # ✅ Correct
  Octocat: 1234567890  # ❌ Won't match
```

## Assignment in update_fields

You can also use mapping to update assignee fields:

```yaml
- when:
    event: pull_request
    action: opened
    has_asana_tasks: true
  then:
    update_fields:
      '1234567890': '{{map_github_to_asana pr.author}}'
      # If field 1234567890 is an assignee field
```

Though typically you'd use this in `create_task`.

## Complete Example with Bots and Humans

```yaml
user_mappings: |
  alice: 1234567890
  bob: 0987654321
  dependabot[bot]: 1111111111
  renovate[bot]: 1111111111

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
        notes: 'PR: {{pr.url}}'
        assignee: '{{map_github_to_asana pr.author}}'
        # Alice PRs → Alice
        # Bob PRs → Bob
        # Dependabot PRs → User 1111111111
        # Unknown users → Unassigned
```

## Next Steps

- [Build Label Automation](/examples/build-label-automation) - React to labels
- [Multi-Condition Filtering](/examples/multi-condition-filtering) - Complex conditions
- [map_github_to_asana](/reference/helpers/user-mapping) - Complete reference
- [or Helper](/reference/helpers/utilities) - Fallback logic
