---
layout: home

hero:
  name: "Asana GitHub Sync"
  text: "Rule-based PR automation"
  tagline: Automatically sync GitHub pull requests to Asana tasks using flexible, declarative rules
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: View Examples
      link: /examples/basic-status-update
    - theme: alt
      text: GitHub
      link: https://github.com/planningcenter/asana-github-sync

features:
  - icon: ⚡️
    title: Rule-Based Automation
    details: Define custom rules for different PR events. Create tasks, update fields, post comments - all triggered by PR lifecycle events.

  - icon: 🎯
    title: Flexible Conditions
    details: Match on event types, PR state, labels, authors, and more. Combine multiple conditions to create precise automation rules.

  - icon: 🔧
    title: Task Management
    details: Automatically create Asana tasks from PRs, update custom fields based on PR state, and mark tasks complete when PRs merge.

  - icon: 📝
    title: Template System
    details: Use Handlebars templates with custom helpers to generate dynamic content. Extract data from PR descriptions, comments, and more.

  - icon: 🔍
    title: Type-Safe Configuration
    details: YAML-based configuration with comprehensive validation. Catch errors before deployment with clear, actionable error messages.

  - icon: 🚀
    title: Zero Dependencies
    details: Pure GitHub Action with no external services required. Works with any Asana workspace using only your Personal Access Token.
---

::: warning 🚧 Docs Under Construction!
This documentation site is actively being built. Some pages are still missing, and you might find a few dead links along the way. We're working fast to get everything documented! Check back soon or explore what's already here.
:::

## Quick Example

```yaml
name: Sync PR to Asana
on:
  pull_request:
    types: [opened, closed]

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
              # Update status when PR opens
              - when:
                  event: pull_request
                  action: opened
                then:
                  update_fields:
                    '1234567890': 'In Review'

              # Mark complete when PR merges
              - when:
                  event: pull_request
                  action: closed
                  merged: true
                then:
                  update_fields:
                    '1234567890': 'Shipped'
                  mark_complete: true
```

## What makes this different?

- **Declarative rules** instead of imperative scripts
- **Built-in validation** to catch configuration errors early
- **Comprehensive templating** for dynamic content generation
- **Real-world tested** - used in production at Planning Center
- **Replaces multiple tools** - consolidates various Asana/GitHub automation approaches

[Get Started →](/guide/)
