# Conditions

When rules trigger based on GitHub events and PR state.

## Overview

Conditions define when a rule should execute. They appear in the `when` block and use **AND logic** - all conditions must match for the rule to trigger.

```yaml
when:
  event: pull_request      # Required
  action: opened           # Optional
  merged: true             # Optional
  draft: false             # Optional
  # All must match
```

## Required Conditions

### event

Every rule must specify an event:

```yaml
when:
  event: pull_request  # Required - GitHub event name
```

See [event reference](/reference/conditions/event) for all supported events.

## Optional Conditions

All other conditions are optional and refine when rules trigger.

### action

Filter by event action:

```yaml
when:
  event: pull_request
  action: opened  # Only when PRs open
```

Supports arrays for multiple actions:

```yaml
when:
  event: pull_request
  action: [opened, reopened, synchronize]
```

See [action reference](/reference/conditions/action).

### merged

Filter by merge status:

```yaml
when:
  event: pull_request
  action: closed
  merged: true  # Only merged PRs
```

```yaml
when:
  event: pull_request
  action: closed
  merged: false  # Only closed without merge
```

See [merged reference](/reference/conditions/merged).

### draft

Filter by draft status:

```yaml
when:
  event: pull_request
  action: opened
  draft: true  # Only draft PRs
```

::: warning Default Behavior
By default (when omitted), rules match **both draft and non-draft PRs**. Most teams should explicitly add `draft: false` to skip draft PRs.
:::

See [draft reference](/reference/conditions/draft).

### label

Match specific label names:

```yaml
when:
  event: pull_request
  action: labeled
  label: ready-for-qa  # Exact match, case-sensitive
```

See [label reference](/reference/conditions/label).

### has_asana_tasks

Critical condition for create vs update:

```yaml
# Create tasks
when:
  event: pull_request
  has_asana_tasks: false  # No Asana URL in PR
then:
  create_task:
    # ...

# Update tasks (default behavior)
when:
  event: pull_request
  # Omitting has_asana_tasks means true
then:
  update_fields:
    # ...
```

See [has_asana_tasks reference](/reference/conditions/has-asana-tasks).

### author

Filter by PR author username:

```yaml
when:
  event: pull_request
  author: dependabot[bot]  # Single author
```

Supports arrays:

```yaml
when:
  event: pull_request
  author: [dependabot[bot], renovate[bot], snyk-bot]
```

::: warning Bot Usernames
Bot usernames include `[bot]` suffix: `dependabot[bot]`, not `dependabot`.
:::

See [author reference](/reference/conditions/author).

## Condition Logic

### AND Logic

All conditions must match:

```yaml
when:
  event: pull_request    # ✓ Must match
  action: opened         # ✓ AND must match
  author: alice          # ✓ AND must match
  label: urgent          # ✓ AND must match
```

If any condition fails, the entire rule is skipped.

### OR Logic

Create separate rules for OR behavior:

```yaml
# Match opened OR reopened
- when:
    event: pull_request
    action: opened
  then:
    # Action

- when:
    event: pull_request
    action: reopened
  then:
    # Same action
```

Or use array syntax:

```yaml
when:
  event: pull_request
  action: [opened, reopened]  # Matches either
```

### No NOT Logic

There's no "exclude" or "not" logic. To exclude authors:

```yaml
# ❌ Can't do: author_not: [bot]

# ✅ Instead: separate workflows or explicit inclusion
when:
  author: [alice, bob, charlie]  # Only these users
```

## Common Patterns

### Non-Draft PRs

Most rules target non-draft PRs. Explicitly add `draft: false`:

```yaml
when:
  event: pull_request
  action: opened
  draft: false  # Skip draft PRs
```

### Merged PRs

Distinguish merged from abandoned:

```yaml
# Merged
- when:
    event: pull_request
    action: closed
    merged: true
  then:
    mark_complete: true

# Abandoned
- when:
    event: pull_request
    action: closed
    merged: false
  then:
    update_fields:
      '1234567890': '0987654321'  # "Cancelled"
```

### Label-Triggered Actions

React to specific labels:

```yaml
when:
  event: pull_request
  action: labeled
  label: ready-for-qa
then:
  update_fields:
    '1234567890': '0987654321'  # "QA Requested"
```

### Bot PRs

Handle dependency bots:

```yaml
when:
  event: pull_request
  action: opened
  has_asana_tasks: false
  author: [dependabot[bot], renovate[bot]]
then:
  create_task:
    # ...
```

### Draft Conversion

React when draft becomes ready:

```yaml
when:
  event: pull_request
  action: ready_for_review
then:
  update_fields:
    '1234567890': '0987654321'  # "In Review"
```

## Validation Rules

Conditions are validated:

- **event:** Required, must be supported event name
- **action:** String or array of strings
- **merged:** Boolean (`true` or `false`)
- **draft:** Boolean (`true` or `false`)
- **label:** String (exact match)
- **has_asana_tasks:** Boolean (`true` or `false`)
- **author:** String or array of strings

Invalid values fail with error messages.

## Multiple Rules

Rules are independent. This is valid:

```yaml
rules:
  # Rule 1: All PRs
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1111111111': '2222222222'

  # Rule 2: Bot PRs (also matches rule 1!)
  - when:
      event: pull_request
      action: opened
      author: [dependabot[bot]]
    then:
      update_fields:
        '3333333333': '4444444444'
```

::: warning Both Rules Run
For bot PRs, **both** rules execute. The first rule has no author filter, so it matches all PRs including bots.
:::

## Performance

Condition checks are fast (simple comparisons). Using many conditions doesn't impact performance.

## Next Steps

- [event](/reference/conditions/event) - Required event condition
- [has_asana_tasks](/reference/conditions/has-asana-tasks) - Create vs update
- [merged](/reference/conditions/merged) - Merge status
- [draft](/reference/conditions/draft) - Draft status
- [label](/reference/conditions/label) - Label matching
- [author](/reference/conditions/author) - Author filtering
- [action](/reference/conditions/action) - Action filtering
