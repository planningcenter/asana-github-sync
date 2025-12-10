# User Mapping Helper

Map GitHub usernames to Asana user GIDs.

## Overview

The `map_github_to_asana` helper converts GitHub usernames to Asana user GIDs using a configured mapping. This allows you to automatically assign tasks to the correct Asana users based on PR authors or assignees.

## Syntax

```handlebars
{{map_github_to_asana githubUsername}}
```

**Parameters:**
- `githubUsername` - GitHub username to look up

**Returns:** Asana user GID if found, empty string otherwise

## Configuration Required

This helper requires the `user_mappings` input in your workflow:

```yaml
- uses: planningcenter/asana-github-sync@main
  with:
    asana_token: ${{ secrets.ASANA_TOKEN }}
    github_token: ${{ github.token }}
    user_mappings: |
      octocat: 1234567890
      dependabot[bot]: 0987654321
      renovate[bot]: 1111111111
    rules: |
      # Your rules here
```

## Examples

### Assign to PR Author

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
        title: '{{pr.title}}'
        assignee: '{{map_github_to_asana pr.author}}'
```

### Assign to PR Assignee

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
        title: '{{pr.title}}'
        assignee: '{{map_github_to_asana pr.assignee}}'
```

### With Fallback

Use `or` helper to provide a default:

```yaml
create_task:
  assignee: '{{or (map_github_to_asana pr.author) "2222222222"}}'
```

### Bot Mapping

Map bot accounts to specific Asana users:

```yaml
# In user_mappings:
user_mappings: |
  dependabot[bot]: 1234567890
  renovate[bot]: 1234567890
  github-actions[bot]: 0987654321

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
        title: '{{clean_title pr.title}}'
        assignee: '{{map_github_to_asana pr.author}}'
```

### Team Routing

Map different team members:

```yaml
user_mappings: |
  alice: 1111111111
  bob: 2222222222
  charlie: 3333333333

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

## Finding Asana User GIDs

### Method 1: From Asana URL

When viewing a user's tasks:
```
https://app.asana.com/0/my_tasks/{user_gid}/list
                              ^^^^^^^^
```

### Method 2: Using Asana API

```bash
curl "https://app.asana.com/api/1.0/workspaces/{workspace}/users" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Returns:
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

### Method 3: Using "me"

For assigning to yourself:
```yaml
assignee: 'me'
```

## Behavior

### Successful Mapping

```yaml
# user_mappings:
# octocat: 1234567890

{{map_github_to_asana "octocat"}}  # Returns: "1234567890"
```

### No Mapping Found

```yaml
# user_mappings doesn't include "unknown-user"

{{map_github_to_asana "unknown-user"}}  # Returns: ""
```

### Empty Result Handling

When mapping returns empty string, field updates are skipped:

```yaml
# If pr.author not in user_mappings, task created without assignee
create_task:
  assignee: '{{map_github_to_asana pr.author}}'  # Skipped if empty
```

## Common Patterns

### Assign or Default

Assign to mapped user, or specific fallback:

```yaml
create_task:
  assignee: '{{or (map_github_to_asana pr.author) "1234567890"}}'
```

### Conditional Assignment

Only assign if mapping exists:

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
        title: '{{pr.title}}'
        assignee: '{{map_github_to_asana pr.author}}'
        # If empty, task created without assignee
```

### Different Mappings per Bot

Route different bots to different people:

```yaml
user_mappings: |
  dependabot[bot]: 1111111111    # Backend team
  renovate[bot]: 2222222222       # Frontend team
  snyk-bot: 3333333333           # Security team
```

### Use PR Assignee

Assign Asana task to whoever is assigned the PR:

```yaml
create_task:
  assignee: '{{or (map_github_to_asana pr.assignee) (map_github_to_asana pr.author)}}'
```

This tries PR assignee first, falls back to author.

## Case Sensitivity

GitHub usernames are case-insensitive, but the mapping is exact match:

```yaml
# ❌ Wrong - case doesn't match
user_mappings: |
  Octocat: 1234567890

# GitHub username is "octocat" (lowercase)
# {{map_github_to_asana "octocat"}}  # Returns: "" (no match)

# ✅ Correct - match GitHub's exact format
user_mappings: |
  octocat: 1234567890
```

::: tip
Use the exact username format from GitHub. For bots, include `[bot]`.
:::

## Bot Username Format

Bot usernames always include `[bot]`:

```yaml
user_mappings: |
  dependabot[bot]: 1234567890      # ✅ Correct
  renovate[bot]: 0987654321        # ✅ Correct
  github-actions[bot]: 1111111111  # ✅ Correct
```

Not:
```yaml
user_mappings: |
  dependabot: 1234567890           # ❌ Wrong
  Renovate[bot]: 0987654321        # ❌ Wrong (case)
```

## Using with Update Fields

You can use mapping in field updates too:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': '{{map_github_to_asana pr.author}}'
```

Though typically you'd map to a user GID for an assignee field in task creation.

## Debugging Mappings

To see what's being mapped, use in a PR comment:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
    then:
      post_pr_comment: |
        Debug Mapping:
        - Author: {{pr.author}}
        - Mapped: {{map_github_to_asana pr.author}}
```

## Validation

The action doesn't validate that mapped GIDs are valid Asana users. If you provide an invalid GID, the Asana API will return an error.

## Security

User mappings are stored in workflow YAML, which is typically public. GIDs are not sensitive - they're just numeric identifiers.

::: tip
User GIDs are safe to commit to public repositories. They don't provide access to Asana accounts.
:::

## See Also

- [create_task](/reference/actions/create-task#assignee) - Using assignee field
- [or Helper](/reference/helpers/utilities#or) - Provide fallback GIDs
- [Context Variables](/reference/context-variables#pr-author) - pr.author and pr.assignee
- [Installation Guide](/guide/installation) - Setting up user_mappings
