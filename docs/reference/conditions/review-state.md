# review_state

Filter by the state of a submitted pull request review.

## Type

`string | string[]`

## Description

The `review_state` condition matches against the review state from a `pull_request_review` event. This lets you distinguish between approved reviews, change requests, and comments.

## Syntax

```yaml
when:
  event: pull_request_review
  action: submitted
  review_state: approved
```

## Values

| Value | Meaning |
|-------|---------|
| `approved` | Review approved the PR |
| `changes_requested` | Review requested changes |
| `commented` | Review left a comment without approval or rejection |
| (omitted) | Any review state |

## Examples

### Update Field on Approval

Mark the Asana task as code-approved when a review is approved:

```yaml
rules:
  - when:
      event: pull_request_review
      action: submitted
      review_state: approved
    then:
      update_fields:
        '1234567890': 'Code Approved'
```

### Handle Multiple States

Match on either approval or comment:

```yaml
rules:
  - when:
      event: pull_request_review
      action: submitted
      review_state: [approved, commented]
    then:
      update_fields:
        '1234567890': 'Reviewed'
```

### Track Change Requests

Update status when changes are requested:

```yaml
rules:
  - when:
      event: pull_request_review
      action: submitted
      review_state: changes_requested
    then:
      update_fields:
        '1234567890': 'Changes Requested'
```

## Important Notes

::: warning
The `review_state` condition only applies to `pull_request_review` events. It will never match on `pull_request` or `issues` events.
:::

## Validation Rules

- **Optional**: Not required
- **Type**: Must be a string or array of strings
- **Context**: Only meaningful for `pull_request_review` events

## Workflow Configuration

Make sure your workflow listens for review events:

```yaml
on:
  pull_request_review:
    types: [submitted, edited, dismissed]
```

## See Also

- [event](/reference/conditions/event) - The `pull_request_review` event
- [action](/reference/conditions/action) - Filter by event action (submitted, edited, dismissed)
