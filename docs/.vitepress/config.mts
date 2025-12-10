import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Asana GitHub Sync',
  description: 'Rule-based automation for syncing GitHub PRs to Asana',
  base: '/asana-github-sync/',
  ignoreDeadLinks: true, // TODO: Remove once all pages are created

  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Reference', link: '/reference/conditions/event' },
      { text: 'Examples', link: '/examples/basic-status-update' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Your First Rule', link: '/guide/your-first-rule' },
          ]
        }
      ],

      '/concepts/': [
        {
          text: 'Core Concepts',
          items: [
            { text: 'Rules Overview', link: '/concepts/rules-overview' },
            { text: 'Conditions', link: '/concepts/conditions' },
            { text: 'Actions', link: '/concepts/actions' },
            { text: 'Templates', link: '/concepts/templates' },
          ]
        }
      ],

      '/reference/': [
        {
          text: 'Conditions',
          collapsed: false,
          items: [
            { text: 'event', link: '/reference/conditions/event' },
            { text: 'action', link: '/reference/conditions/action' },
            { text: 'merged', link: '/reference/conditions/merged' },
            { text: 'draft', link: '/reference/conditions/draft' },
            { text: 'label', link: '/reference/conditions/label' },
            { text: 'has_asana_tasks', link: '/reference/conditions/has-asana-tasks' },
            { text: 'author', link: '/reference/conditions/author' },
          ]
        },
        {
          text: 'Actions',
          collapsed: false,
          items: [
            { text: 'create_task', link: '/reference/actions/create-task' },
            { text: 'update_fields', link: '/reference/actions/update-fields' },
            { text: 'mark_complete', link: '/reference/actions/mark-complete' },
            { text: 'post_pr_comment', link: '/reference/actions/post-comment' },
          ]
        },
        {
          text: 'Template Helpers',
          collapsed: false,
          items: [
            { text: 'Extraction Helpers', link: '/reference/helpers/extraction' },
            { text: 'Text Processing', link: '/reference/helpers/text-processing' },
            { text: 'User Mapping', link: '/reference/helpers/user-mapping' },
            { text: 'Utilities', link: '/reference/helpers/utilities' },
          ]
        },
        {
          text: 'Other Reference',
          collapsed: false,
          items: [
            { text: 'Context Variables', link: '/reference/context-variables' },
            { text: 'Validation Rules', link: '/reference/validation-rules' },
            { text: 'Inputs & Outputs', link: '/reference/inputs-outputs' },
          ]
        }
      ],

      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Basic Status Update', link: '/examples/basic-status-update' },
            { text: 'Mark Complete on Merge', link: '/examples/mark-complete-on-merge' },
            { text: 'Bot Task Creation', link: '/examples/bot-task-creation' },
            { text: 'User Assigned Tasks', link: '/examples/user-assigned-tasks' },
            { text: 'Build Label Automation', link: '/examples/build-label-automation' },
            { text: 'Multi-Condition Filtering', link: '/examples/multi-condition-filtering' },
          ]
        }
      ],

      '/migration/': [
        {
          text: 'Migration',
          items: [
            { text: 'From v1', link: '/migration/from-v1' },
          ]
        }
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/planningcenter/asana-github-sync' }
    ],

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/planningcenter/asana-github-sync/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present Planning Center'
    }
  }
})
