# TODO: Future Enhancements

<!-- TODO: REMOVE! -->

## High Priority

### 1. Skip updates when Asana task IDs unchanged on edit
**Problem**: Currently processes all `edited` events, even if only the PR description changed but Asana links stayed the same.

**v1 Behavior**: Used `extractAsanaTaskIds(pr.body, payload.changes?.body?.from)` which returned `parseResult.changed` flag. Only updated tasks if the task IDs actually changed.

**Solution**:
- Add logic in `src/index.ts` to compare current task IDs with previous task IDs
- Skip rule execution if task IDs haven't changed
- Log: "PR body edited but Asana task links unchanged, skipping"

**Code reference**: See old implementation in git history at src/index.ts:51-60

---

### 2. Add `has_labels` condition for label matching
**Problem**: Current `label` condition only works with single label from `labeled` event. Can't match "PR has any of these labels".

**Use case**:
```yaml
rules:
  - when:
      event: pull_request
      has_labels: [bug, hotfix]  # Match if PR has ANY of these labels
    then:
      update_fields:
        '123': 'High Priority'
```

**Implementation**:
- Add `has_labels?: string[]` to `Condition` interface in `src/rules/types.ts`
- Update `matchesCondition()` in `src/rules/engine.ts` to:
  - Fetch PR labels from GitHub API (requires Octokit client)
  - Check if any label in `has_labels` array matches any PR label
- Add to `RuleContext` interface: `labels?: string[]` (array of all PR labels)
- Update `buildRuleContext()` to fetch labels from payload or API
- Add validation in `src/rules/validator.ts`
- Add tests in `__tests__/rules/engine.test.ts`

**Notes**:
- Different from `label` condition which only checks single label from `labeled` event
- Requires GitHub API call (may need caching)
- Should work with all events, not just `labeled`

---

## Medium Priority

### 3. Field Type System
**Status**: Not implemented yet (MVP scope)

**Implementation needed**:
- `src/fields/schema.ts` - Schema cache for custom fields
- `src/fields/handlers.ts` - Type coercion (enum, text, number, date)
- `src/fields/updater.ts` - Batch update logic

**Current workaround**: Action logs field updates but doesn't apply them to Asana

---

### 4. Handlebars Extraction Helpers
**Status**: Skipped for MVP

**Helpers to implement**:
- `extract_from_body` - Extract from PR body with regex
- `extract_from_title` - Extract from PR title with regex
- `extract_from_comments` - Extract from PR comments with regex (async)

**See plan**: /Users/jt/.claude/plans/optimized-sleeping-moon.md (Milestone 2)

---

## Low Priority

### 5. Multiple action types support
Currently `action` can be string or array, but only checks exact match. Could support wildcards or exclusions.

### 6. Better error messages
When rules don't match, log which conditions failed and why.

### 7. Dry-run mode
Add input flag to log what would be updated without actually calling Asana API.
