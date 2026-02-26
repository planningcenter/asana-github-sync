/**
 * Tests for Handlebars extraction helpers
 */

import { describe, test, expect, beforeAll, beforeEach, spyOn } from 'bun:test';
import * as core from '@actions/core';
import Handlebars from 'handlebars';
import { registerHelpers } from '../../src/expression/helpers';
import { HandlebarsContext } from '../../src/expression/context';

// Create spies for @actions/core
const infoSpy = spyOn(core, 'info').mockImplementation(() => {});
const errorSpy = spyOn(core, 'error').mockImplementation(() => {});
const warningSpy = spyOn(core, 'warning').mockImplementation(() => {});
const debugSpy = spyOn(core, 'debug').mockImplementation(() => {});

describe('Handlebars Extraction Helpers', () => {
  beforeAll(() => {
    // Register helpers once before all tests
    registerHelpers();
  });

  beforeEach(() => {
    infoSpy.mockClear();
    errorSpy.mockClear();
    warningSpy.mockClear();
    debugSpy.mockClear();
  });

  describe('extract_from_body', () => {
    test('extracts first capture group from PR body', () => {
      const context: HandlebarsContext = {
        pr: {
          number: 123,
          title: 'Test PR',
          body: 'This is BUILD-456 from our CI',
          merged: false,
          draft: false,
          author: 'testuser',
          base_ref: 'main',
          head_ref: 'feature',
          url: 'https://github.com/owner/repo/pull/123',
        },
        event: {
          name: 'pull_request',
          action: 'opened',
        },
      };

      const template = Handlebars.compile('{{extract_from_body "BUILD-(\\d+)"}}');
      const result = template(context);

      expect(result).toBe('456');
    });

    test('returns empty string when no match found', () => {
      const context: HandlebarsContext = {
        pr: {
          number: 123,
          title: 'Test PR',
          body: 'No build number here',
          merged: false,
          draft: false,
          author: 'testuser',
          base_ref: 'main',
          head_ref: 'feature',
          url: 'https://github.com/owner/repo/pull/123',
        },
        event: {
          name: 'pull_request',
          action: 'opened',
        },
      };

      const template = Handlebars.compile('{{extract_from_body "BUILD-(\\d+)"}}');
      const result = template(context);

      expect(result).toBe('');
    });

    test('returns full match when no capture group in pattern', () => {
      const context: HandlebarsContext = {
        pr: {
          number: 123,
          title: 'Test PR',
          body: 'BUILD-456',
          merged: false,
          draft: false,
          author: 'testuser',
          base_ref: 'main',
          head_ref: 'feature',
          url: 'https://github.com/owner/repo/pull/123',
        },
        event: {
          name: 'pull_request',
          action: 'opened',
        },
      };

      const template = Handlebars.compile('{{extract_from_body "BUILD-\\d+"}}');
      const result = template(context);

      expect(result).toBe('BUILD-456');
    });

    test('handles invalid regex pattern gracefully', () => {
      const context: HandlebarsContext = {
        pr: {
          number: 123,
          title: 'Test PR',
          body: 'Test body',
          merged: false,
          draft: false,
          author: 'testuser',
          base_ref: 'main',
          head_ref: 'feature',
          url: 'https://github.com/owner/repo/pull/123',
        },
        event: {
          name: 'pull_request',
          action: 'opened',
        },
      };

      const template = Handlebars.compile('{{extract_from_body "((invalid"}}');
      const result = template(context);

      expect(result).toBe('');
      expect(core.error).toHaveBeenCalled();
    });

    test('extracts from multiline body', () => {
      const context: HandlebarsContext = {
        pr: {
          number: 123,
          title: 'Test PR',
          body: 'Line 1\nBUILD-789\nLine 3',
          merged: false,
          draft: false,
          author: 'testuser',
          base_ref: 'main',
          head_ref: 'feature',
          url: 'https://github.com/owner/repo/pull/123',
        },
        event: {
          name: 'pull_request',
          action: 'opened',
        },
      };

      const template = Handlebars.compile('{{extract_from_body "BUILD-(\\d+)"}}');
      const result = template(context);

      expect(result).toBe('789');
    });

    test('handles empty body', () => {
      const context: HandlebarsContext = {
        pr: {
          number: 123,
          title: 'Test PR',
          body: '',
          merged: false,
          draft: false,
          author: 'testuser',
          base_ref: 'main',
          head_ref: 'feature',
          url: 'https://github.com/owner/repo/pull/123',
        },
        event: {
          name: 'pull_request',
          action: 'opened',
        },
      };

      const template = Handlebars.compile('{{extract_from_body "BUILD-(\\d+)"}}');
      const result = template(context);

      expect(result).toBe('');
    });
  });

  describe('extract_from_title', () => {
    test('extracts first capture group from PR title', () => {
      const context: HandlebarsContext = {
        pr: {
          number: 123,
          title: '[JIRA-123] Fix bug in parser',
          body: 'Test body',
          merged: false,
          draft: false,
          author: 'testuser',
          base_ref: 'main',
          head_ref: 'feature',
          url: 'https://github.com/owner/repo/pull/123',
        },
        event: {
          name: 'pull_request',
          action: 'opened',
        },
      };

      const template = Handlebars.compile('{{extract_from_title "\\[([A-Z]+-\\d+)\\]"}}');
      const result = template(context);

      expect(result).toBe('JIRA-123');
    });

    test('returns empty string when no match found in title', () => {
      const context: HandlebarsContext = {
        pr: {
          number: 123,
          title: 'No ticket here',
          body: 'Test body',
          merged: false,
          draft: false,
          author: 'testuser',
          base_ref: 'main',
          head_ref: 'feature',
          url: 'https://github.com/owner/repo/pull/123',
        },
        event: {
          name: 'pull_request',
          action: 'opened',
        },
      };

      const template = Handlebars.compile('{{extract_from_title "\\[([A-Z]+-\\d+)\\]"}}');
      const result = template(context);

      expect(result).toBe('');
    });

    test('handles empty title', () => {
      const context: HandlebarsContext = {
        pr: {
          number: 123,
          title: '',
          body: 'Test body',
          merged: false,
          draft: false,
          author: 'testuser',
          base_ref: 'main',
          head_ref: 'feature',
          url: 'https://github.com/owner/repo/pull/123',
        },
        event: {
          name: 'pull_request',
          action: 'opened',
        },
      };

      const template = Handlebars.compile('{{extract_from_title "\\[([A-Z]+-\\d+)\\]"}}');
      const result = template(context);

      expect(result).toBe('');
    });
  });

  describe('extract_from_comments', () => {
    test('extracts from comments when present in context', () => {
      const context: HandlebarsContext = {
        pr: {
          number: 123,
          title: 'Test PR',
          body: 'Test body',
          merged: false,
          draft: false,
          author: 'testuser',
          base_ref: 'main',
          head_ref: 'feature',
          url: 'https://github.com/owner/repo/pull/123',
        },
        event: {
          name: 'pull_request',
          action: 'opened',
        },
        comments: 'This looks good!\nVERSION-3.2.1 approved',
      };

      const template = Handlebars.compile('{{extract_from_comments "VERSION-([\\d.]+)"}}');
      const result = template(context);

      expect(result).toBe('3.2.1');
    });

    test('returns empty string when comments not in context', () => {
      const context: HandlebarsContext = {
        pr: {
          number: 123,
          title: 'Test PR',
          body: 'Test body',
          merged: false,
          draft: false,
          author: 'testuser',
          base_ref: 'main',
          head_ref: 'feature',
          url: 'https://github.com/owner/repo/pull/123',
        },
        event: {
          name: 'pull_request',
          action: 'opened',
        },
      };

      const template = Handlebars.compile('{{extract_from_comments "VERSION-(\\d+)"}}');
      const result = template(context);

      expect(result).toBe('');
    });

    test('returns empty string when no match in comments', () => {
      const context: HandlebarsContext = {
        pr: {
          number: 123,
          title: 'Test PR',
          body: 'Test body',
          merged: false,
          draft: false,
          author: 'testuser',
          base_ref: 'main',
          head_ref: 'feature',
          url: 'https://github.com/owner/repo/pull/123',
        },
        event: {
          name: 'pull_request',
          action: 'opened',
        },
        comments: 'This looks good!\nLGTM',
      };

      const template = Handlebars.compile('{{extract_from_comments "VERSION-(\\d+)"}}');
      const result = template(context);

      expect(result).toBe('');
    });
  });

  describe('Integration with templates', () => {
    test('can use extract_from_body in field value template', () => {
      const context: HandlebarsContext = {
        pr: {
          number: 123,
          title: 'Test PR',
          body: 'Deploy BUILD-999 to staging',
          merged: false,
          draft: false,
          author: 'testuser',
          base_ref: 'main',
          head_ref: 'feature',
          url: 'https://github.com/owner/repo/pull/123',
        },
        event: {
          name: 'pull_request',
          action: 'opened',
        },
      };

      const template = Handlebars.compile('Build {{extract_from_body "BUILD-(\\d+)"}}');
      const result = template(context);

      expect(result).toBe('Build 999');
    });

    test('can use multiple extractions in single template', () => {
      const context: HandlebarsContext = {
        pr: {
          number: 123,
          title: '[JIRA-456] Deploy feature',
          body: 'BUILD-789',
          merged: false,
          draft: false,
          author: 'testuser',
          base_ref: 'main',
          head_ref: 'feature',
          url: 'https://github.com/owner/repo/pull/123',
        },
        event: {
          name: 'pull_request',
          action: 'opened',
        },
      };

      const template = Handlebars.compile(
        '{{extract_from_title "\\[([A-Z]+-\\d+)\\]"}}: Build {{extract_from_body "BUILD-(\\d+)"}}'
      );
      const result = template(context);

      expect(result).toBe('JIRA-456: Build 789');
    });

    test('can combine extraction with regular interpolation', () => {
      const context: HandlebarsContext = {
        pr: {
          number: 123,
          title: 'Deploy feature',
          body: 'VERSION-2.5.3',
          merged: false,
          draft: false,
          author: 'testuser',
          base_ref: 'main',
          head_ref: 'feature',
          url: 'https://github.com/owner/repo/pull/123',
        },
        event: {
          name: 'pull_request',
          action: 'opened',
        },
      };

      const template = Handlebars.compile(
        'PR-{{pr.number}}: Version {{extract_from_body "VERSION-([\\d.]+)"}}'
      );
      const result = template(context);

      expect(result).toBe('PR-123: Version 2.5.3');
    });
  });

  describe('markdown_to_html', () => {
    const compile = (md: string) => Handlebars.compile('{{markdown_to_html text}}')({ text: md });

    test('converts headings', () => {
      expect(compile('# Heading 1')).toContain('<h1>Heading 1</h1>');
      expect(compile('## Heading 2')).toContain('<h2>Heading 2</h2>');
    });

    test('downgrades h3-h6 to h2', () => {
      expect(compile('### Heading 3')).toContain('<h2>Heading 3</h2>');
      expect(compile('#### Heading 4')).toContain('<h2>Heading 4</h2>');
      expect(compile('##### Heading 5')).toContain('<h2>Heading 5</h2>');
      expect(compile('###### Heading 6')).toContain('<h2>Heading 6</h2>');
    });

    test('converts bold and italic', () => {
      const result = compile('**bold** and _italic_');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
    });

    test('converts unordered lists', () => {
      const result = compile('- item 1\n- item 2');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>item 1</li>');
      expect(result).toContain('<li>item 2</li>');
    });

    test('converts ordered lists', () => {
      const result = compile('1. first\n2. second');
      expect(result).toContain('<ol>');
      expect(result).toContain('<li>first</li>');
    });

    test('converts links', () => {
      const result = compile('[GitHub](https://github.com)');
      expect(result).toContain('<a href="https://github.com">GitHub</a>');
    });

    test('converts code blocks and strips class attribute', () => {
      const result = compile('```js\nconsole.log("hi");\n```');
      expect(result).toContain('<code>');
      expect(result).not.toContain('class=');
    });

    test('converts strikethrough to <s> instead of <del>', () => {
      const result = compile('~~strikethrough~~');
      expect(result).toContain('<s>strikethrough</s>');
      expect(result).not.toContain('<del>');
    });

    test('strips standalone images', () => {
      const result = compile('![screenshot](https://example.com/img.png)');
      expect(result).not.toContain('<img');
    });

    test('strips linked images', () => {
      const result = compile('[![badge](https://example.com/badge.png)](https://example.com)');
      expect(result).not.toContain('<img');
    });

    test('unwraps <details> blocks, preserving content', () => {
      const result = compile('<details><summary>Click to expand</summary>secret content</details>');
      expect(result).not.toContain('<details');
      expect(result).not.toContain('<summary');
      expect(result).toContain('Click to expand');
      expect(result).toContain('secret content');
    });

    test('normalizes tables to Asana-supported tags', () => {
      const result = compile('| Col 1 | Col 2 |\n|-------|-------|\n| a     | b     |');
      expect(result).toContain('<table>');
      expect(result).toContain('<tr>');
      expect(result).toContain('<td>Col 1</td>');
      expect(result).toContain('<td>a</td>');
      expect(result).not.toContain('<thead');
      expect(result).not.toContain('<tbody');
      expect(result).not.toContain('<th');
    });

    test('strips HTML-style comments', () => {
      const result = compile('[//]: # (this is a comment)\nvisible');
      expect(result).not.toContain('this is a comment');
      expect(result).toContain('visible');
    });

    test('drops raw HTML tags from input', () => {
      expect(compile('<script>alert(1)</script>')).not.toContain('<script>');
      expect(compile('<a onclick="evil()">click</a>')).not.toContain('onclick');
    });

    test('returns empty string for empty input', () => {
      expect(compile('')).toBe('');
    });

    test('handles typical PR body', () => {
      const body = `## Summary\n\n- Added login feature\n- Fixed bug\n\n## Notes\n\nSee [PR](https://github.com) for details.`;
      const result = compile(body);
      expect(result).toContain('<h2>Summary</h2>');
      expect(result).toContain('<li>Added login feature</li>');
      expect(result).toContain('<h2>Notes</h2>');
      expect(result).toContain('<a href="https://github.com">PR</a>');
    });
  });
});
