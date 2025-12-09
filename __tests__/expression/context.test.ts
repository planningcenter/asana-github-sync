/**
 * Tests for context builder
 */

import { buildContext } from '../../src/expression/context';

describe('buildContext', () => {
  test('builds context from GitHub payload with all PR fields', () => {
    const mockContext = {
      eventName: 'pull_request',
      payload: {
        action: 'opened',
        pull_request: {
          number: 123,
          title: 'Test PR',
          body: 'This is a test PR body',
          merged: false,
          draft: false,
          user: {
            login: 'testuser',
          },
          base: {
            ref: 'main',
          },
          head: {
            ref: 'feature-branch',
          },
          html_url: 'https://github.com/owner/repo/pull/123',
        },
      },
    };

    const context = buildContext(mockContext);

    expect(context).toEqual({
      pr: {
        number: 123,
        title: 'Test PR',
        body: 'This is a test PR body',
        merged: false,
        draft: false,
        author: 'testuser',
        base_ref: 'main',
        head_ref: 'feature-branch',
        url: 'https://github.com/owner/repo/pull/123',
      },
      event: {
        name: 'pull_request',
        action: 'opened',
      },
    });
  });

  test('handles null/undefined PR body', () => {
    const mockContext = {
      eventName: 'pull_request',
      payload: {
        action: 'opened',
        pull_request: {
          number: 123,
          title: 'Test PR',
          body: undefined,
          merged: false,
          draft: false,
          user: { login: 'testuser' },
          base: { ref: 'main' },
          head: { ref: 'feature' },
          html_url: 'https://github.com/owner/repo/pull/123',
        },
      },
    };

    const context = buildContext(mockContext);

    expect(context.pr.body).toBe('');
  });

  test('handles merged PR', () => {
    const mockContext = {
      eventName: 'pull_request',
      payload: {
        action: 'closed',
        pull_request: {
          number: 123,
          title: 'Test PR',
          body: 'Test',
          merged: true,
          draft: false,
          user: { login: 'testuser' },
          base: { ref: 'main' },
          head: { ref: 'feature' },
          html_url: 'https://github.com/owner/repo/pull/123',
        },
      },
    };

    const context = buildContext(mockContext);

    expect(context.pr.merged).toBe(true);
  });

  test('handles draft PR', () => {
    const mockContext = {
      eventName: 'pull_request',
      payload: {
        action: 'opened',
        pull_request: {
          number: 123,
          title: 'Test PR',
          body: 'Test',
          merged: false,
          draft: true,
          user: { login: 'testuser' },
          base: { ref: 'main' },
          head: { ref: 'feature' },
          html_url: 'https://github.com/owner/repo/pull/123',
        },
      },
    };

    const context = buildContext(mockContext);

    expect(context.pr.draft).toBe(true);
  });

  test('includes label context when label is present', () => {
    const mockContext = {
      eventName: 'pull_request',
      payload: {
        action: 'labeled',
        pull_request: {
          number: 123,
          title: 'Test PR',
          body: 'Test',
          merged: false,
          draft: false,
          user: { login: 'testuser' },
          base: { ref: 'main' },
          head: { ref: 'feature' },
          html_url: 'https://github.com/owner/repo/pull/123',
        },
        label: {
          name: 'bug',
        },
      },
    };

    const context = buildContext(mockContext);

    expect(context.label).toEqual({ name: 'bug' });
  });

  test('handles missing action in payload', () => {
    const mockContext = {
      eventName: 'pull_request',
      payload: {
        pull_request: {
          number: 123,
          title: 'Test PR',
          body: 'Test',
          merged: false,
          draft: false,
          user: { login: 'testuser' },
          base: { ref: 'main' },
          head: { ref: 'feature' },
          html_url: 'https://github.com/owner/repo/pull/123',
        },
      },
    };

    const context = buildContext(mockContext);

    expect(context.event.action).toBe('');
  });

  test('throws error when pull_request is missing', () => {
    const mockContext = {
      eventName: 'issue_comment',
      payload: {
        action: 'created',
      },
    };

    expect(() => buildContext(mockContext)).toThrow('No pull_request in GitHub payload');
  });
});
