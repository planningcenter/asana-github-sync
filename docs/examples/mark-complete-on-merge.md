# Mark Complete on Merge

Update status and mark tasks complete when PRs merge.

## Use Case

Automatically complete work in Asana when code ships. When a PR merges:
1. Update Status to "Shipped"
2. Mark the task complete

This is a progressive example building on [Basic Status Update](/examples/basic-status-update) by adding a second rule for PR merges.

## Complete Workflow

```yaml
name: Asana Sync
on:
  pull_request:
    types: [opened, closed]  # Listen for both open and close events

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
              # Rule 1: When PR opens → In Review
              - when:
                  event: pull_request
                  action: opened
                then:
                  update_fields:
                    '1234567890': '0987654321'  # Status → "In Review"

              # Rule 2: When PR merges → Shipped + Complete
              - when:
                  event: pull_request
                  action: closed
                  merged: true  # Only when actually merged (not just closed)
                then:
                  update_fields:
                    '1234567890': '1111111111'  # Status → "Shipped"
                  mark_complete: true
```

## How It Works

### When PR Opens
1. First rule matches (`action: opened`)
2. Status updates to "In Review"

### When PR Merges
1. Second rule matches (`action: closed` + `merged: true`)
2. Status updates to "Shipped"
3. Task is marked complete

### When PR Closes (Without Merge)
No rules match - tasks remain in their current state.

## The merged Condition

The `merged` condition is critical for distinguishing between merged and abandoned PRs:

```yaml
# ✅ Correct - only mark complete when merged
when:
  action: closed
  merged: true

# ❌ Wrong - marks complete even for abandoned PRs
when:
  action: closed
  # No merged check!
```

## Expected Behavior

**When PR Opens:**
- Asana Task Status: "To Do" → "In Review"

**When PR Merges:**
- Asana Task Status: "In Review" → "Shipped"
- Asana Task: Marked complete ✅

**When PR Closes Without Merge:**
- Asana Task: No change (still "In Review")

## Variations

### With PR Comment

Notify the team when work completes:

```yaml
- when:
    event: pull_request
    action: closed
    merged: true
  then:
    update_fields:
      '1234567890': '1111111111'
    mark_complete: true
    post_pr_comment: |
      ✅ PR merged! Asana task marked complete and shipped.
```

### Handle Abandoned PRs

Add a third rule for closed-without-merge:

```yaml
rules:
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': '0987654321'  # "In Review"

  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      update_fields:
        '1234567890': '1111111111'  # "Shipped"
      mark_complete: true

  - when:
      event: pull_request
      action: closed
      merged: false  # Explicitly check for not merged
    then:
      update_fields:
        '1234567890': '2222222222'  # "Cancelled"
```

### Match Draft PRs

Complete draft PRs when merged:

```yaml
- when:
    event: pull_request
    action: closed
    merged: true
    draft: true  # Match draft PRs
  then:
    mark_complete: true
```

::: tip
By default (omitting `draft`), rules match both draft and non-draft PRs. To skip draft PRs, explicitly add `draft: false` to your conditions.
:::

## Common Issues

### Tasks Completing for Closed (Not Merged) PRs

**Problem:** Missing `merged: true` condition

**Solution:**

```yaml
# ❌ Wrong
when:
  event: pull_request
  action: closed

# ✅ Correct
when:
  event: pull_request
  action: closed
  merged: true
```

### Workflow Not Triggering on Close

**Problem:** Workflow types don't include `closed`

**Solution:**

```yaml
on:
  pull_request:
    types: [opened, closed]  # ← Must include 'closed'
```

### Field Update Works But Task Not Completing

**Problem:** Task doesn't have Asana URL in PR description

**Solution:** Both actions require `has_asana_tasks: true` (the default). Verify PR description contains Asana task link.

## Multiple Tasks

If a PR links to multiple Asana tasks, all of them will be updated and marked complete:

```markdown
PR Description:
Fixes https://app.asana.com/0/111/222
Fixes https://app.asana.com/0/111/333
```

Both tasks 222 and 333 will be completed when the PR merges.

## Next Steps

- [Bot Task Creation](/examples/bot-task-creation) - Auto-create tasks for bot PRs
- [Build Label Automation](/examples/build-label-automation) - React to build labels
- [merged Condition](/reference/conditions/merged) - Complete reference
- [mark_complete Action](/reference/actions/mark-complete) - Complete reference
