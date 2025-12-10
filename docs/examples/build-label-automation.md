# Build Label Automation

Extract build information when CI adds labels to PRs.

## Use Case

Your CI system adds a `build_created` label to PRs when builds complete. Automatically:
1. Update Asana when label is added
2. Extract build details from PR comments
3. Update multiple Asana fields with build info

## Complete Workflow

```yaml
name: Asana Build Sync
on:
  pull_request:
    types: [labeled]  # Only when labels are added

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
              - when:
                  event: pull_request
                  action: labeled
                  label: build_created  # Specific label name
                then:
                  update_fields:
                    '1234567890': '0987654321'  # Status → "Build Ready"
                    '1111111111': '{{extract_from_comments "Build #(\\d+)"}}'  # Build Number
                    '2222222222': '{{extract_from_comments "Version: ([\\d.]+)"}}'  # Version
                  post_pr_comment: |
                    ✅ Build information updated in Asana
```

## How It Works

1. **CI Completes Build** - Your CI posts comment and adds label:
   ```
   Comment: "Build #12345 completed with Version 2.1.0"
   Label: build_created
   ```

2. **Workflow Triggers** - On `labeled` event

3. **Action Fetches Comments** - Because `extract_from_comments` is used, PR comments are automatically fetched

4. **Extraction Happens** - Regex patterns pull data:
   - `Build #(\\d+)` captures `12345`
   - `Version: ([\\d.]+)` captures `2.1.0`

5. **Fields Update** - Asana fields populated with extracted values

## Key Concepts

### label Condition

Matches exact label name:

```yaml
label: build_created  # Must match exactly (case-sensitive)
```

### extract_from_comments

::: warning Important
Using `extract_from_comments` **automatically triggers comment fetching**. This is the only time comments are fetched to avoid unnecessary API calls.
:::

Syntax:
```handlebars
{{extract_from_comments "pattern"}}
```

Returns first capture group or empty string.

### Regex Patterns

| Pattern | Matches | Captures |
|---------|---------|----------|
| `Build #(\\d+)` | `Build #12345` | `12345` |
| `Version: ([\\d.]+)` | `Version: 2.1.0` | `2.1.0` |
| `Environment: (\\w+)` | `Environment: staging` | `staging` |

**Remember:** Double backslashes in YAML strings.

## Expected Behavior

**CI posts comment:**
```
✅ Build #12345 completed
Version: 2.1.0
Environment: production
```

**Then adds label:** `build_created`

**Asana updates:**
- Status Field: "Build Ready"
- Build Number: "12345"
- Version: "2.1.0"

**PR comment posted:**
```
✅ Build information updated in Asana

- Build #12345
- Version 2.1.0
```

## Variations

### Multiple Labels

Different actions for different labels:

```yaml
rules:
  # Build created
  - when:
      event: pull_request
      action: labeled
      label: build_created
    then:
      update_fields:
        '1234567890': '0987654321'  # "Build Ready"

  # Deployed
  - when:
      event: pull_request
      action: labeled
      label: deployed
    then:
      update_fields:
        '1234567890': '1111111111'  # "Deployed"
      mark_complete: true
```

### With Fallback Values

Use `or` helper for defaults:

```yaml
update_fields:
  '1111111111': '{{or (extract_from_comments "Build #(\\d+)") "Unknown"}}'
  '2222222222': '{{or (extract_from_comments "Version: ([\\d.]+)") "dev"}}'
```

### Only Update if Extracted

Skip update if pattern not found:

```yaml
update_fields:
  '1111111111': '{{extract_from_comments "Build #(\\d+)"}}'
  # If pattern doesn't match, returns empty string → field update skipped
```

### Complex Extraction

Multiple patterns from same comment:

```yaml
# Comment: "Deploy to production (Build #123, Version 2.1.0)"
update_fields:
  '1111111111': '{{extract_from_comments "Build #(\\d+)"}}'         # "123"
  '2222222222': '{{extract_from_comments "Version ([\\d.]+)"}}'     # "2.1.0"
  '3333333333': '{{extract_from_comments "Deploy to (\\w+)"}}'      # "production"
```

## Real-World Example

Firebase Test Lab adds build comments:

```yaml
rules:
  - when:
      event: pull_request
      action: labeled
      label: build_created
    then:
      update_fields:
        # QA Status → "QA Requested"
        '1202880331736132': '1202888299403896'
        # Build Type → "Test"
        '1203158031514948': '1203211562684746'
        # Status → "In Review"
        '1202887490284881': '1202887490288021'
        # Test Version # → extracted + "(firebase)" appended
        '1210535494227756': '{{extract_from_comments "Build completed with Version (.+)"}} (firebase)'
      post_pr_comment: |
        ✅ Updated Asana task with build information

        Build: {{extract_from_comments "Build completed with Version (.+)"}}
```

## Common Issues

### Pattern Not Matching

**Problem:** Regex doesn't match comment format

**Solution:** Test regex at [regex101.com](https://regex101.com/):
1. Select "JavaScript" flavor
2. Paste your pattern (single backslashes)
3. Test against comment text
4. Double backslashes for YAML

### Empty Field Values

**Problem:** Extraction returns empty string

**Solution:** Check:
- Pattern syntax (capture groups)
- Comment actually contains expected text
- Use `or` helper for fallback:
  ```yaml
  '1234567890': '{{or (extract_from_comments "Pattern") "Not Found"}}'
  ```

### Workflow Not Triggering

**Problem:** Workflow types don't include `labeled`

**Solution:**

```yaml
on:
  pull_request:
    types: [labeled]  # ← Must include labeled
```

### Label Name Mismatch

**Problem:** Label in workflow doesn't match actual label

**Solution:** Check exact label name (case-sensitive):

```yaml
# GitHub label: "build_created"
label: build_created  # ✅ Exact match
label: Build_Created  # ❌ Wrong case
```

### Comments Not Available

**Problem:** Comments not fetched

**Solution:** This shouldn't happen - `extract_from_comments` automatically triggers fetching. Check that the helper is actually being used in your rules.

## Testing Your Patterns

Debug extraction in PR comments:

```yaml
post_pr_comment: |
  Debug Info:
  - Raw match: "{{extract_from_comments "Build #(\\d+)"}}"
  - With fallback: "{{or (extract_from_comments "Build #(\\d+)") "NOT FOUND"}}"
```

## Multiple Comments

If multiple comments match, the first capture group from the first match is used:

```
Comment 1: "Build #100"
Comment 2: "Build #200"
```

Result: `"100"` (first match)

## Next Steps

- [Multi-Condition Filtering](/examples/multi-condition-filtering) - Combine multiple conditions
- [extract_from_comments](/reference/helpers/extraction#extract_from_comments) - Complete reference
- [label Condition](/reference/conditions/label) - Complete reference
- [Context Variables](/reference/context-variables#comments) - Comments variable
