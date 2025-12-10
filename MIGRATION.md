# Migration from Old GitHub Actions

## Workflow 1: Build Created Label

### Old Workflow

https://github.com/planningcenter/services-ios/blob/main/.github/workflows/update-asana-task.yml

### New Workflow

```yaml
name: Update Asana Task

on:
  pull_request:
    types:
      - labeled

jobs:
  update-asana-task:
    runs-on: ubuntu-latest
    steps:
      - name: Sync PR to Asana
        uses: planningcenter/asana-github-sync@main
        with:
          asana_token: ${{ secrets.ASANA_PERSONAL_ACCESS_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          rules: |
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
                    # Test Version # → extracted from comments
                    '1210535494227756': '{{extract_from_comments "Build completed with Version (.+)"}} (firebase)'
                  post_pr_comment: |
                    ✅ Updated {{summary.total}} Asana task{{#unless (eq summary.total 1)}}s{{/unless}} with build information

                    **Tasks Updated:**
                    {{#each tasks}}• {{name}}
                    {{/each}}

                    **Asana Fields Updated:**
                    • Status: In Review
                    • QA: QA Requested
                    • Build Type: Test
                    • Test Version #: {{extract_from_comments "Build completed with Version (.+)"}}
```

## Workflow 2: PR Description Change

### Old Workflows

- https://github.com/planningcenter/ChurchCenterApp/blob/main/.github/workflows/description_change.yml (reusable)
- https://github.com/planningcenter/ChurchCenterApp/blob/main/.github/workflows/update_asana_custom_field.yml

### New Workflow

```yaml
name: PR Description Change Workflow

on:
  pull_request:
    types:
      - edited

jobs:
  update-asana-field:
    runs-on: ubuntu-latest
    steps:
      - name: Sync PR to Asana
        uses: planningcenter/asana-github-sync@main
        with:
          asana_token: ${{ secrets.ASANA_PERSONAL_ACCESS_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          rules: |
            comment_on_pr_when_asana_url_missing: true
            rules:
              - when:
                  event: pull_request
                  action: edited
                then:
                  update_fields:
                    # Build Number field
                    '1203119596857860': '{{extract_from_comments "Build number:\\s*(\\d+)\\s+has been successfully created."}}'
                  post_pr_comment: |
                    {{#if (extract_from_comments "Build number:\\s*(\\d+)\\s+has been successfully created.")}}
                    ✅ Updated Asana task with build information

                    Asana Fields Updated:
                     Name: {{#each tasks}}{{name}}{{/each}}
                    • Build Number: ({{extract_from_comments "Build number:\\s*(\\d+)\\s+has been successfully created."}})
                    {{/if}}
```
