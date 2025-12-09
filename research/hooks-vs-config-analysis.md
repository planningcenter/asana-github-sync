# Hooks vs Configuration: Architectural Decision

## Question

Should asana-github-sync provide scripting/hooks for extensibility, or use flexible configuration instead?

**Context:** After analyzing 6 real-world automation attempts, we considered whether a hook-based architecture would better serve diverse use cases.

## Hook-Based Architecture (Considered)

```yaml
- uses: planningcenter/asana-github-sync@v1
  with:
    on_pr_opened: |
      async ({ pr, github, asana }) => {
        const taskId = await findOrCreateTask(pr);
        await asana.updateTask(taskId, {
          custom_fields: { 'status': 'In Review', 'pr_number': pr.number }
        });
      }

    on_pr_merged: |
      async ({ pr, github, asana }) => {
        // User-defined logic
      }
```

### Theoretical Benefits
- One tool handles all use cases
- Maximum flexibility
- Users write custom logic for their needs

## Why We Rejected Hooks (For Now)

### 1. The Diversity is Configuration, Not Logic

All 6 attempts follow the same pattern:
```
event happens → update field(s) to value(s)
```

They differ in:
- **Which fields** to update (Status vs Status+QA+Build Type)
- **Which values** to set (enum option GIDs)
- **Which events** to trigger on (opened, merged, labeled)

They DON'T need:
- Complex conditional logic
- API calls to other services
- Data transformations

**Config solves this better than code.**

### 2. User Experience Comparison

**With hooks (optimizes for power users):**
```yaml
on_pr_opened: |
  const taskId = extractTaskId(pr.body);
  await asana.updateTask(taskId, {
    custom_fields: { '123': '456' }
  });
```
- Requires JavaScript knowledge
- Hard to document all available APIs
- Difficult to debug
- Security concerns (sandboxing, validation)

**With flexible config (optimizes for common case):**
```yaml
custom_field_gid: '123'
state_on_opened: 'In Review'
```
- Declarative and clear
- Easy to validate
- Simple to document
- No security concerns

**90% of users want the second one.**

### 3. Real-World Use Cases Are Simple

| Use Case | What They Need | Hooks Required? |
|----------|---------------|-----------------|
| Attempt #1 | Create task if none exists | No - config flag: `auto_create_task: true` |
| Attempt #2 | Create task for Dependabot | No - config: `create_for_authors: ['dependabot[bot]']` |
| Attempt #3 | Filter by author | No - config: `create_for_authors: [...]` |
| Attempt #6 | Update 4 fields | No - config: `custom_fields: { ... }` |
| Status sync | Update Status field | No - config: `state_on_opened: 'In Review'` |

**None of these need scripting.**

### 4. Complexity Cost

Hooks require:
- JavaScript execution environment (VM/sandbox)
- Security validation
- API surface documentation
- Error handling for user code
- Debugging support
- Type definitions for context objects

**All this complexity serves 10% of users.**

## Decision: Flexible Config for MVP

Support both simple and complex use cases through configuration:

```yaml
- uses: planningcenter/asana-github-sync@v1
  with:
    # Simple case (90% of users)
    custom_field_gid: '123'
    state_on_opened: 'In Review'
    state_on_merged: 'Done'

    # OR complex case (handles Attempt #6)
    custom_fields_on_opened: |
      1202887490284881: "1202887490288021"  # Status: In Review
      1202880331736132: "1202888299403896"  # QA: Requested
      1203158031514948: "1203211562684746"  # Build Type: Test

    custom_fields_on_merged: |
      1202887490284881: "1202887490288030"  # Status: Done

    mark_complete_on_merge: true
```

**Benefits:**
- Simple case stays simple
- Complex case is still declarative
- No security concerns
- Easy to validate and document
- Covers all observed use cases

## When Hooks WOULD Make Sense

Hooks are valuable for **side effects** and **integrations**, not core functionality:

```yaml
- uses: planningcenter/asana-github-sync@v1
  with:
    # Core functionality (declarative)
    state_on_opened: 'In Review'
    state_on_merged: 'Done'

    # Optional: Side effects (imperative)
    after_task_updated: '.github/scripts/notify.js'
```

Example hook for side effects:
```javascript
// .github/scripts/notify.js
module.exports = async ({ asanaTask, pr, github }) => {
  // Main action already updated the task
  // This is just for notifications/integrations

  await github.rest.issues.createComment({
    body: `✅ Updated Asana: ${asanaTask.permalink_url}`
  });

  await fetch(slackWebhook, {
    method: 'POST',
    body: JSON.stringify({ text: `PR merged: ${pr.title}` })
  });
};
```

**Use cases for hooks:**
- Post comments to PR after update
- Send notifications (Slack, Discord, email)
- Update other systems (Jira, Linear, internal APIs)
- Custom metrics/logging

**NOT for:**
- Core task updates (use config)
- Field value calculation (use config)
- Conditional logic (use workflow `if` conditions)

## Power Users Already Have an Escape Hatch

Users who need custom logic can already do this:

```yaml
- id: custom_logic
  uses: actions/github-script@v7
  with:
    script: |
      // Any custom logic they want
      const state = pr.labels.includes('urgent') ? 'High Priority' : 'In Review';
      return state;

- uses: planningcenter/asana-github-sync@v1
  with:
    state_on_opened: ${{ steps.custom_logic.outputs.result }}
```

This keeps our action simple while allowing unlimited extensibility.

## Recommendation

**MVP (Milestone 1):**
- Flexible config for simple and multi-field cases
- NO hooks/scripting

**Future (Milestone 3+):**
- Consider lifecycle hooks for side effects only
- `after_task_updated`, `after_task_created`, etc.
- Script file path, not inline code
- Well-defined context objects
- Comprehensive documentation

## Key Insight

> **The diversity in real-world attempts is configuration, not logic.**
>
> Users need different fields, different values, different triggers—but they all follow the same pattern: "when X happens, set Y to Z."
>
> Config handles this elegantly. Hooks would be overkill.

## References

- Analysis of 6 automation attempts: `/Users/jt/.claude/plans/misty-mixing-hopcroft.md`
- Attempt #6 (multi-field): Updates 4 fields declaratively, no scripting needed
- Option 2 pattern: `actions/github-script` before action allows custom logic
