/**
 * Tests for Handlebars extraction helpers
 */

import * as core from '@actions/core';
import Handlebars from 'handlebars';
import { registerHelpers } from '../../src/expression/helpers';
import { HandlebarsContext } from '../../src/expression/context';

// Mock @actions/core
jest.mock('@actions/core');

describe('Handlebars Extraction Helpers', () => {
  beforeAll(() => {
    // Register helpers once before all tests
    registerHelpers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
});
