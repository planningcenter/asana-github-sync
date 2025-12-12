# author

Filter by PR author username.

## Type

`string | string[]`

## Description

The `author` condition matches the GitHub username of the PR author. Use this to create different automation rules for different users or bots.

This is particularly useful for handling bot PRs (Dependabot, Renovate) differently from human PRs.

## Syntax

```yaml
# Single author
when:
  event: pull_request
  author: octocat

# Multiple authors (any match)
when:
  event: pull_request
  author: [dependabot[bot], renovate[bot]]
```

## Examples

### Create Tasks for Bot PRs

Automatically create Asana tasks for dependency update PRs:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
      author: [dependabot[bot], renovate[bot]]
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        title: '{{clean_title pr.title}}'
        html_notes: '<a href="{{pr.url}}">{{pr.title}}</a>'
```

### Skip Bot PRs

Only update Asana for human PRs:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      author: [dependabot[bot], renovate[bot]]
    then:
      # Skip - no action needed for bots
```

Or use a negative pattern (though this requires separate rules):

```yaml
rules:
  # Rule for all PRs except specific authors
  # (Note: There's no built-in "not" operator)
  - when:
      event: pull_request
      action: opened
      # Only matches if author is not in the bot list
    then:
      update_fields:
        '1234567890': 'In Review'
```

::: info
Currently there's no "not" operator for conditions. To exclude specific authors, you need to either create separate rules or handle all cases explicitly.
:::

### Different Actions per Author

Route work based on author:

```yaml
rules:
  # Bot PRs → Create tasks automatically
  - when:
      event: pull_request
      action: opened
      author: dependabot[bot]
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        title: '{{pr.title}}'

  # Senior dev PRs → Fast track
  - when:
      event: pull_request
      action: opened
      author: senior-dev
    then:
      update_fields:
        '1234567890': 'Fast Track Review'

  # Junior dev PRs → Standard review
  - when:
      event: pull_request
      action: opened
      author: junior-dev
    then:
      update_fields:
        '1234567890': 'Standard Review'
```

### Bot-Specific Handling

Common bots and their usernames:

| Bot | Username |
|-----|----------|
| Dependabot | `dependabot[bot]` |
| Renovate | `renovate[bot]` |
| GitHub Actions | `github-actions[bot]` |
| Snyk | `snyk-bot` |
| Greenkeeper | `greenkeeper[bot]` |

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      author: [dependabot[bot], renovate[bot], github-actions[bot]]
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        section: '1111111111'  # "Bot PRs" section
        title: '{{clean_title pr.title}}'
```

## Username Format

::: warning
Bot usernames typically end with `[bot]`:
- ✅ `dependabot[bot]` (correct)
- ❌ `dependabot` (wrong - won't match)
- ❌ `Dependabot[bot]` (wrong - case sensitive)
:::

Usernames are **case-sensitive**:

| PR Author | Condition | Match? |
|-----------|-----------|--------|
| `octocat` | `author: octocat` | ✅ Yes |
| `Octocat` | `author: octocat` | ❌ No |
| `dependabot[bot]` | `author: 'dependabot[bot]'` | ✅ Yes |

## Common Patterns

### Dependency Bot Automation

Handle all dependency update bots:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
      author: [dependabot[bot], renovate[bot], snyk-bot]
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        section: '2222222222'  # Dependencies section
        title: '{{clean_title pr.title}}'
```

### Team Routing

Route PRs from specific team members:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      author: [backend-dev-1, backend-dev-2]
    then:
      update_fields:
        '1234567890': 'Backend Team'

  - when:
      event: pull_request
      action: opened
      author: [frontend-dev-1, frontend-dev-2]
    then:
      update_fields:
        '1234567890': 'Frontend Team'
```

### VIP Notification

Special handling for key contributors:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      author: [cto, tech-lead]
    then:
      update_fields:
        '1234567890': 'Priority Review'
      post_pr_comment: |
        🔥 Priority PR from @{{pr.author}}
```

## Combining with Other Conditions

### Bots Without Asana Tasks

Create tasks only for bot PRs that don't have Asana links:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false  # No Asana link in description
      author: dependabot[bot]
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        title: '{{pr.title}}'
```

### Draft PRs from Specific Authors

Only notify for non-draft PRs from certain authors:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      draft: false
      author: [senior-dev-1, senior-dev-2]
    then:
      update_fields:
        '1234567890': 'Senior Dev Review'
```

## Validation Rules

- **Optional**: Not required
- **Type**: String for single author, array of strings for multiple
- **Array**: Cannot be empty if using array format
- **Case-sensitive**: Must match GitHub username exactly
- **Special characters**: Include `[bot]` for bot accounts

## Common Errors

### Forgetting [bot] suffix

```yaml
# ❌ Wrong - missing [bot] suffix
when:
  event: pull_request
  author: dependabot

# ✅ Correct - include [bot]
when:
  event: pull_request
  author: 'dependabot[bot]'
```

### Case mismatch

```yaml
# ❌ Wrong - case doesn't match
# (GitHub username is "Octocat")
when:
  event: pull_request
  author: octocat

# ✅ Correct - match exact case
when:
  event: pull_request
  author: Octocat
```

### Empty array

```yaml
# ❌ Wrong - empty array not allowed
when:
  event: pull_request
  author: []

# ✅ Correct - single author or non-empty array
when:
  event: pull_request
  author: octocat
```

## Finding Usernames

To find the exact username:

1. **From PR**: Look at the PR author in GitHub UI
2. **From API**: Use `\{\{pr.author\}\}` in a template to see the value
3. **Test rule**: Add a debug comment to see the author:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
    then:
      post_pr_comment: |
        Debug: PR author is "{{pr.author}}"
```

## See Also

- [has_asana_tasks](/reference/conditions/has-asana-tasks) - Filter by task presence (commonly used with author)
- [create_task](/reference/actions/create-task) - Create tasks (common for bot authors)
- [pr.author](/reference/context-variables#pr-author) - Template variable for author
