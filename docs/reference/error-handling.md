# Error Handling and Retry Strategy

How the action handles failures and retries API requests.

## Overview

The asana-github-sync action is designed with a **fail-safe philosophy**: errors in syncing to Asana should never block your PR workflows or deployments.

## Never Fails Workflows

**Critical Design Decision:** This action catches all errors and never causes workflow failures.

```typescript
// All errors are caught and logged
catch (error) {
  core.error(`Action error: ${error.message}`);
  // Workflow continues - no throw or process.exit()
}
```

### What This Means

| Scenario | Behavior |
|----------|----------|
| Asana API error | ⚠️ Logged, workflow succeeds |
| Invalid configuration | ⚠️ Logged, workflow succeeds |
| Network timeout | ⚠️ Logged, workflow succeeds |
| Task not found | ⚠️ Logged, workflow succeeds |
| Authentication failure | ⚠️ Logged, workflow succeeds |

Your PR can always be merged, reviewed, or closed regardless of Asana sync status.

::: warning Important
Check GitHub Actions logs if you notice Asana tasks aren't updating. The action won't block your workflow, but errors will be logged there.
:::

## Retry Strategy

The action automatically retries failed API requests with exponential backoff.

### Retry Configuration

| Setting | Value |
|---------|-------|
| Max attempts | 3 |
| Initial delay | 1 second |
| Backoff multiplier | 2x |
| Max delay | 10 seconds |

### Example Retry Sequence

```
Attempt 1: Immediate
  ↓ (fails)
Wait 1 second
Attempt 2: Try again
  ↓ (fails)
Wait 2 seconds
Attempt 3: Final try
  ↓ (succeeds or gives up)
```

### Retryable Errors

These errors trigger automatic retries:

| Error Type | HTTP Status | Description |
|------------|-------------|-------------|
| Rate limit | 429 | Too many requests |
| Server error | 500 | Internal server error |
| Bad gateway | 502 | Upstream error |
| Service unavailable | 503 | Temporary unavailability |
| Gateway timeout | 504 | Upstream timeout |
| Network error | - | Connection reset, timeout |

### Non-Retryable Errors

These errors fail immediately (no retries):

| Error Type | HTTP Status | Description |
|------------|-------------|-------------|
| Bad request | 400 | Invalid data format |
| Unauthorized | 401 | Invalid Asana token |
| Forbidden | 403 | Insufficient permissions |
| Not found | 404 | Task or project doesn't exist |
| Conflict | 409 | Resource conflict |

::: tip Why No Retries?
Client errors (4xx) indicate configuration problems that won't be fixed by retrying. Check your rules configuration and Asana GIDs.
:::

## Rate Limits

### Asana API Limits

Asana enforces rate limits on API requests:

| Token Type | Requests per Minute |
|-----------|---------------------|
| Personal Access Token | 150 |
| OAuth App Token | 1,500 |

::: warning Rate Limit Considerations
- Multiple PRs in quick succession can hit rate limits
- Each field update requires API calls (2-3 per task)
- Field schema fetching adds extra calls (cached per run)
- Comment fetching adds 1 API call per PR
:::

### Rate Limit Behavior

When rate limited (429 response):
1. Action waits for the retry delay
2. Retries up to 3 times total
3. If still rate limited, logs error and continues
4. Other PRs in queue may succeed

### Avoiding Rate Limits

**Best practices:**
1. Use Personal Access Tokens for low-traffic repos (< 150 PRs/hour)
2. Use OAuth tokens for high-traffic repos
3. Minimize unique custom field GIDs across rules
4. Avoid `extract_from_comments` if possible (saves 1 API call)

## Error Types and Solutions

### Authentication Errors (401)

**Error message:**
```
Error: Request failed with status code 401
```

**Causes:**
- Invalid or expired Asana Personal Access Token
- Token doesn't have access to workspace/project

**Solutions:**
1. Regenerate Asana token at https://app.asana.com/0/my-apps
2. Verify token is added to GitHub Secrets correctly
3. Ensure token has access to the workspace/project

### Permission Errors (403)

**Error message:**
```
Error: Request failed with status code 403
```

**Causes:**
- Token lacks permissions for the requested operation
- Workspace or project privacy settings
- Field is read-only or restricted

**Solutions:**
1. Verify token owner has access to the project
2. Check custom field permissions in Asana
3. Ensure project isn't archived or restricted

### Not Found Errors (404)

**Error message:**
```
Error: Request failed with status code 404
```

**Causes:**
- Task GID doesn't exist
- Project GID is incorrect
- Field GID is invalid
- Task was deleted in Asana

**Solutions:**
1. Verify all GIDs in your rules configuration
2. Check that tasks exist in Asana before PR creates link
3. Ensure project hasn't been deleted

### Validation Errors (400)

**Error message:**
```
Error: Request failed with status code 400
```

**Causes:**
- Invalid field value for custom field type
- Enum field value doesn't match available options
- Date field has invalid format
- Required field missing value

**Solutions:**
1. For enum fields, ensure value matches option name exactly
2. For date fields, use YYYY-MM-DD format
3. For number fields, ensure value is numeric
4. Check field type in Asana project settings

## Field Schema Caching

To optimize API usage, field schemas are cached during each action run.

### How It Works

```
First field update for field GID "123":
  1. Fetch schema from Asana (1 API call)
  2. Cache schema in memory
  3. Coerce value using schema
  4. Update field

Subsequent updates for field GID "123":
  1. Use cached schema (0 API calls)
  2. Coerce value
  3. Update field
```

### Performance Impact

| Scenario | API Calls |
|----------|-----------|
| Update 1 field on 5 tasks | 6 (1 schema + 5 updates) |
| Update 3 different fields on 5 tasks | 18 (3 schemas + 15 updates) |
| Update same field on 10 tasks | 11 (1 schema + 10 updates) |

::: tip Optimization
Reuse the same field GIDs across rules to benefit from caching.
:::

## Comment Deduplication

The action prevents duplicate PR comments when workflows re-run.

### How It Works

1. Before posting a comment, fetch existing PR comments
2. Compare new comment body with existing comments
3. If exact match found, skip posting
4. If no match, post the new comment

::: info
Comments are matched by **exact body text**. Even minor differences (whitespace, capitalization) will post a new comment.
:::

## Debugging Failures

### Check GitHub Actions Logs

1. Go to the Actions tab in your repository
2. Click the failed/completed workflow run
3. Click the job that ran asana-github-sync
4. Expand the action step
5. Look for error messages in red

### Common Log Patterns

**Rate limit hit:**
```
Error: Request failed with status code 429
Retrying in 1000ms...
```

**Authentication failure:**
```
Error: Request failed with status code 401
Check your ASANA_TOKEN secret
```

**Invalid field GID:**
```
Error: Request failed with status code 404
Field GID '1234567890' not found
```

### Enable Debug Logging

Add to your workflow:

```yaml
env:
  ACTIONS_STEP_DEBUG: true
```

This enables verbose logging including API requests and responses.

## Best Practices

### 1. Monitor Action Output

Periodically check that your rules are executing successfully:

```yaml
- name: Check sync status
  run: |
    echo "Tasks synced: ${{ steps.asana.outputs.task_ids }}"
    echo "Updates applied: ${{ steps.asana.outputs.field_updates }}"
```

### 2. Test Rules in Staging

Use a staging Asana project to test rules before production:

```yaml
- uses: planningcenter/asana-github-sync@main
  with:
    rules: |
      rules:
        - when:
            event: pull_request
          then:
            update_fields:
              '1234567890': '0987654321'  # Staging project GID
```

### 3. Use Specific Error Messages

Make PR comments informative when errors might occur:

```yaml
post_pr_comment: |
  ✅ Asana task updated: {{pr.title}}

  If the task didn't update, check the Actions logs.
```

### 4. Handle Missing Tasks Gracefully

Use `has_asana_tasks` to handle PRs without task links:

```yaml
rules:
  # Update existing tasks
  - when:
      event: pull_request
      has_asana_tasks: true
    then:
      update_fields:
        '1234567890': 'In Review'

  # Prompt for task link if missing
  - when:
      event: pull_request
      has_asana_tasks: false
    then:
      post_pr_comment: |
        ⚠️ No Asana task found. Please add task URL to PR description.
```

## See Also

- [Validation Rules](/reference/validation-rules) - Catch configuration errors before execution
- [Inputs and Outputs](/reference/inputs-outputs) - Configuration reference
- [GitHub Actions Logs](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/using-workflow-run-logs) - Viewing logs
