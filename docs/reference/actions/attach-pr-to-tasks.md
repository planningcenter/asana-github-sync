# attach_pr_to_tasks

Attach GitHub pull request to existing Asana tasks via the GitHub integration.

## Type

`boolean`

## Description

The `attach_pr_to_tasks` action links the current GitHub PR to existing Asana tasks through the Asana-GitHub integration. This creates a proper integration attachment with live PR status in Asana, rather than just a plain URL link.

::: warning Pull request events only
`attach_pr_to_tasks` is **not supported for `issues` events**. The Asana-GitHub integration is designed specifically for pull requests. Using this action in an `issues` rule logs a warning and skips the step.
:::

::: warning Requirements
- Requires `has_asana_tasks: true` (default)
- Requires `integration_secret` input to be configured
- Automatically deduplicates to avoid linking the same PR multiple times
:::

## Syntax

```yaml
then:
  attach_pr_to_tasks: true
```

## Setup

Configure the `integration_secret` in your workflow:

```yaml
- uses: planningcenter/asana-github-sync@main
  with:
    asana_token: ${{ secrets.ASANA_TOKEN }}
    github_token: ${{ github.token }}
    integration_secret: ${{ secrets.ASANA_INTEGRATION_SECRET }}
    rules: |
      # ...
```

See [Inputs documentation](/reference/inputs-outputs#integration_secret) for details on obtaining your integration secret.

## Examples

### Attach When PR Opens

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: true
    then:
      attach_pr_to_tasks: true
      update_fields:
        '1234567890': '0987654321'  # Status → "In Review"
```

### Skip Draft PRs

```yaml
rules:
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: true
      draft: false
    then:
      attach_pr_to_tasks: true
```

### Full PR Lifecycle

```yaml
rules:
  # Attach when opened
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: true
    then:
      attach_pr_to_tasks: true
      update_fields:
        '1234567890': '1111111111'  # Status → "In Review"

  # Update on changes (no re-attach needed)
  - when:
      event: pull_request
      action: synchronize
    then:
      update_fields:
        '1234567890': '2222222222'  # Status → "Updated"

  # Complete on merge
  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      update_fields:
        '1234567890': '3333333333'  # Status → "Shipped"
      mark_complete: true
```

## Behavior

When `attach_pr_to_tasks: true`:
1. Finds all Asana task URLs in PR description
2. Checks if PR is already linked (deduplication)
3. Attaches PR via Asana-GitHub integration if not already linked
4. PR appears in Asana with live status

## Combining Actions

| Action | Compatible? |
|--------|-------------|
| `update_fields` | ✅ Yes |
| `mark_complete` | ✅ Yes |
| `post_pr_comment` | ✅ Yes |
| `create_task` | ❌ No (requires `has_asana_tasks: false`) |

## Common Errors

### Missing Integration Secret

```yaml
# ❌ Wrong - will be skipped with warning
# (integration_secret not configured)

# ✅ Correct - include integration_secret in workflow inputs
- uses: planningcenter/asana-github-sync@main
  with:
    integration_secret: ${{ secrets.ASANA_INTEGRATION_SECRET }}
```

### Using with has_asana_tasks: false

```yaml
# ❌ Wrong - can't attach to non-existent tasks
when:
  has_asana_tasks: false
then:
  attach_pr_to_tasks: true

# ✅ Correct
when:
  has_asana_tasks: true  # Or omit
then:
  attach_pr_to_tasks: true
```

## See Also

- [has_asana_tasks](/reference/conditions/has-asana-tasks) - Required condition
- [update_fields](/reference/actions/update-fields) - Update fields alongside attachment
- [Inputs & Outputs](/reference/inputs-outputs#integration_secret) - Setting up integration_secret
