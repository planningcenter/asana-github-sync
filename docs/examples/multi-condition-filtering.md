# Multi-Condition Filtering

Combine multiple conditions for precise automation rules.

## Use Case

Create sophisticated automation by combining conditions. Only trigger actions when **all conditions** match (AND logic):
- Right event type
- Right action
- Right PR state
- Right author
- Right label

## Complete Workflow

```yaml
name: Asana Sync
on:
  pull_request:
    types: [opened, labeled, closed]

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write  # For posting comments
      contents: read        # For reading PR data
    steps:
      - uses: planningcenter/asana-github-sync@main
        with:
          asana_token: ${{ secrets.ASANA_TOKEN }}
          github_token: ${{ github.token }}
          rules: |
            rules:
              # Rule 1: PR opens → In Review
              # (matches both draft and non-draft PRs)
              - when:
                  event: pull_request
                  action: opened
                then:
                  update_fields:
                    '1234567890': '0987654321'  # Status → "In Review"

              # Rule 2: QA label → QA Requested
              - when:
                  event: pull_request
                  action: labeled
                  label: ready-for-qa
                then:
                  update_fields:
                    '1234567890': '1111111111'  # Status → "QA Requested"

              # Rule 3: PR merges → Shipped + Complete
              - when:
                  event: pull_request
                  action: closed
                  merged: true
                then:
                  update_fields:
                    '1234567890': '2222222222'  # Status → "Shipped"
                  mark_complete: true

              # Rule 4: Draft converts to ready → In Review
              - when:
                  event: pull_request
                  action: ready_for_review
                then:
                  update_fields:
                    '1234567890': '0987654321'  # Status → "In Review"
```

## How It Works

### AND Logic

All conditions in a `when` block must match:

```yaml
when:
  event: pull_request     # ✓ Must be true
  action: opened          # ✓ Must be true
  merged: true            # ✓ Must be true
  # All conditions must match for rule to trigger
```

::: warning Default Behavior
By default (when `draft` is omitted), rules match **both draft and non-draft PRs**. Most teams should add `draft: false` to skip draft PRs. Use `draft: true` to explicitly match only draft PRs.
:::

### Different Rules for Different Scenarios

Each rule is independent. The action runs all matching rules.

## Filtering Patterns

### Match Draft PRs

```yaml
when:
  event: pull_request
  action: [opened, reopened]
  draft: true  # Explicitly match draft PRs only
```

::: tip
When `draft` is omitted, rules match both draft and non-draft PRs. To skip drafts, add `draft: false`.
:::

### Only Specific Authors

```yaml
when:
  event: pull_request
  action: opened
  author: [alice, bob, charlie]  # Only these users
```

### Bot PRs Without Tasks

```yaml
when:
  event: pull_request
  action: opened
  has_asana_tasks: false  # No existing task
  author: [dependabot[bot], renovate[bot]]  # Only bots
```

### High Priority Merges

```yaml
when:
  event: pull_request
  action: closed
  merged: true  # Actually merged
  label: priority:high  # Has priority label
```

### Deployment Labels

```yaml
when:
  event: pull_request
  action: labeled
  label: deployed
  merged: true  # Already merged
```

## Complete PR Lifecycle Example

```yaml
rules:
  # Draft PR opens → No action
  # (default rules don't match drafts)

  # Draft → Ready
  - when:
      event: pull_request
      action: ready_for_review
    then:
      update_fields:
        '1234567890': '1111111111'  # "In Review"
      post_pr_comment: "PR ready for review!"

  # Non-draft PR opens
  # (omitting 'draft' means non-draft only)
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': '1111111111'  # "In Review"

  # Changes pushed to PR
  - when:
      event: pull_request
      action: synchronize
    then:
      update_fields:
        '1234567890': '2222222222'  # "Updated"

  # QA label added
  - when:
      event: pull_request
      action: labeled
      label: ready-for-qa
    then:
      update_fields:
        '1234567890': '3333333333'  # "QA Requested"

  # Approved label added
  - when:
      event: pull_request
      action: labeled
      label: approved
    then:
      update_fields:
        '1234567890': '4444444444'  # "Approved"

  # PR merges
  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      update_fields:
        '1234567890': '5555555555'  # "Shipped"
      mark_complete: true

  # PR closed without merge
  - when:
      event: pull_request
      action: closed
      merged: false
    then:
      update_fields:
        '1234567890': '6666666666'  # "Cancelled"
```

## Team-Specific Routing

Different teams, different workflows:

```yaml
rules:
  # Backend team PRs
  - when:
      event: pull_request
      action: opened
      author: [backend-dev-1, backend-dev-2]
    then:
      update_fields:
        '1234567890': '1111111111'  # Team: Backend

  # Frontend team PRs
  - when:
      event: pull_request
      action: opened
      author: [frontend-dev-1, frontend-dev-2]
    then:
      update_fields:
        '1234567890': '2222222222'  # Team: Frontend

  # Bot PRs → Different handling
  - when:
      event: pull_request
      action: opened
      has_asana_tasks: false
      author: [dependabot[bot]]
    then:
      create_task:
        project: '1234567890'
        workspace: '0987654321'
        section: '3333333333'  # Dependencies section
        title: '{{clean_title pr.title}}'
```

## Priority Handling

Fast-track high-priority work:

```yaml
rules:
  # High priority PRs
  - when:
      event: pull_request
      action: opened
      label: priority:high
    then:
      update_fields:
        '1234567890': '1111111111'  # Priority: High
        '0987654321': '2222222222'  # Status: Urgent Review

  # Normal PRs
  - when:
      event: pull_request
      action: opened
      # No label condition = all PRs (including high priority)
    then:
      update_fields:
        '3333333333': '4444444444'  # Generic field update
```

## Common Patterns

### Different Handling by Author

Use separate rules for different authors:

```yaml
rules:
  # Bot-specific handling
  - when:
      event: pull_request
      action: opened
      author: [dependabot[bot]]
    then:
      update_fields:
        '1111111111': '2222222222'  # Bot-specific field

  # Human PRs (this will ALSO match bots!)
  - when:
      event: pull_request
      action: opened
      # No author filter = matches ALL users including bots
    then:
      update_fields:
        '3333333333': '4444444444'  # Field updated for everyone
```

::: warning
Both rules above will run for bot PRs! The first rule matches bots explicitly, and the second rule matches all authors (including bots). If you want mutually exclusive behavior, you need to use separate workflows or implement exclusion logic outside of rules.
:::

### Multiple Actions, Same Outcome

```yaml
when:
  event: pull_request
  action: [opened, reopened]  # Either action
then:
  # Same outcome for both actions
```

### Nested Logic with Multiple Rules

Want "if A OR B"? Create separate rules:

```yaml
# Rule 1: Condition A
- when:
    condition_a: true
  then:
    # Action

# Rule 2: Condition B
- when:
    condition_b: true
  then:
    # Same action
```

## Validation

All conditions are validated:

```yaml
# ✅ Valid
when:
  event: pull_request      # Required string
  action: opened           # Optional string
  draft: true              # Optional boolean
  merged: true             # Optional boolean

# ❌ Invalid
when:
  event: pull_request
  draft: "true"            # Error: must be boolean, not string
```

## Debugging

Add PR comments to see what matched:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
    then:
      post_pr_comment: |
        Rule matched: PR opened
        - Author: {{pr.author}}
        - Draft: {{pr.draft}}
        - Merged: {{pr.merged}}
```

## Performance

Multiple conditions don't slow down execution. All checks are simple boolean comparisons.

## Next Steps

- [Conditions Reference](/reference/conditions/) - All available conditions
- [Validation Rules](/reference/validation-rules) - Condition validation
- [draft Condition](/reference/conditions/draft) - Draft PR filtering
- [merged Condition](/reference/conditions/merged) - Merge status filtering
- [author Condition](/reference/conditions/author) - User filtering
