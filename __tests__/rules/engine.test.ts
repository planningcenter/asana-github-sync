/**
 * Tests for rules engine
 */

import { describe, test, expect, beforeEach, beforeAll, spyOn } from 'bun:test';
import * as core from '@actions/core';
import { matchesCondition, executeRules, buildRuleContext, RuleContext } from '../../src/rules/engine';
import { Rule, Condition } from '../../src/rules/types';

// Create spies for @actions/core
const infoSpy = spyOn(core, 'info').mockImplementation(() => {});
const errorSpy = spyOn(core, 'error').mockImplementation(() => {});
const warningSpy = spyOn(core, 'warning').mockImplementation(() => {});
const debugSpy = spyOn(core, 'debug').mockImplementation(() => {});

describe('matchesCondition', () => {
  let baseContext: RuleContext;

  beforeEach(() => {
    infoSpy.mockClear();
    errorSpy.mockClear();
    warningSpy.mockClear();
    debugSpy.mockClear();
    baseContext = {
      eventName: 'pull_request',
      action: 'opened',
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
      hasAsanaTasks: true,
    };
  });

  test('matches when event matches', () => {
    const condition: Condition = { event: 'pull_request' };
    expect(matchesCondition(condition, baseContext)).toBe(true);
  });

  test('does not match when event differs', () => {
    const condition: Condition = { event: 'issue_comment' };
    expect(matchesCondition(condition, baseContext)).toBe(false);
  });

  test('matches when event and action match', () => {
    const condition: Condition = { event: 'pull_request', action: 'opened' };
    expect(matchesCondition(condition, baseContext)).toBe(true);
  });

  test('does not match when action differs', () => {
    const condition: Condition = { event: 'pull_request', action: 'closed' };
    expect(matchesCondition(condition, baseContext)).toBe(false);
  });

  test('matches when action is in array', () => {
    const condition: Condition = { event: 'pull_request', action: ['opened', 'reopened'] };
    expect(matchesCondition(condition, baseContext)).toBe(true);
  });

  test('does not match when action not in array', () => {
    const condition: Condition = { event: 'pull_request', action: ['closed', 'reopened'] };
    expect(matchesCondition(condition, baseContext)).toBe(false);
  });

  test('matches when merged condition matches', () => {
    const condition: Condition = { event: 'pull_request', merged: false };
    expect(matchesCondition(condition, baseContext)).toBe(true);
  });

  test('does not match when merged condition differs', () => {
    const condition: Condition = { event: 'pull_request', merged: true };
    expect(matchesCondition(condition, baseContext)).toBe(false);
  });

  test('matches merged PR', () => {
    baseContext = { ...baseContext, pr: { ...baseContext.pr!, merged: true } };
    const condition: Condition = { event: 'pull_request', merged: true };
    expect(matchesCondition(condition, baseContext)).toBe(true);
  });

  test('matches when draft condition matches', () => {
    const condition: Condition = { event: 'pull_request', draft: false };
    expect(matchesCondition(condition, baseContext)).toBe(true);
  });

  test('does not match when draft condition differs', () => {
    const condition: Condition = { event: 'pull_request', draft: true };
    expect(matchesCondition(condition, baseContext)).toBe(false);
  });

  test('matches draft PR', () => {
    baseContext = { ...baseContext, pr: { ...baseContext.pr!, draft: true } };
    const condition: Condition = { event: 'pull_request', draft: true };
    expect(matchesCondition(condition, baseContext)).toBe(true);
  });

  test('matches when label condition matches', () => {
    baseContext.label = { name: 'bug' };
    const condition: Condition = { event: 'pull_request', label: 'bug' };
    expect(matchesCondition(condition, baseContext)).toBe(true);
  });

  test('does not match when label differs', () => {
    baseContext.label = { name: 'feature' };
    const condition: Condition = { event: 'pull_request', label: 'bug' };
    expect(matchesCondition(condition, baseContext)).toBe(false);
  });

  test('does not match when label missing from context', () => {
    const condition: Condition = { event: 'pull_request', label: 'bug' };
    expect(matchesCondition(condition, baseContext)).toBe(false);
  });

  test('matches when has_labels condition matches (single string)', () => {
    baseContext.labels = ['bug', 'feature'];
    const condition: Condition = { event: 'pull_request', has_labels: 'bug' };
    expect(matchesCondition(condition, baseContext)).toBe(true);
  });

  test('does not match when has_labels differs (single string)', () => {
    baseContext.labels = ['feature', 'enhancement'];
    const condition: Condition = { event: 'pull_request', has_labels: 'bug' };
    expect(matchesCondition(condition, baseContext)).toBe(false);
  });

  test('matches when has_labels condition matches (array - one match)', () => {
    baseContext.labels = ['bug', 'feature'];
    const condition: Condition = { event: 'pull_request', has_labels: ['bug', 'hotfix'] };
    expect(matchesCondition(condition, baseContext)).toBe(true);
  });

  test('matches when has_labels condition matches (array - multiple matches)', () => {
    baseContext.labels = ['bug', 'feature', 'hotfix'];
    const condition: Condition = { event: 'pull_request', has_labels: ['bug', 'hotfix'] };
    expect(matchesCondition(condition, baseContext)).toBe(true);
  });

  test('does not match when has_labels differs (array - no matches)', () => {
    baseContext.labels = ['feature', 'enhancement'];
    const condition: Condition = { event: 'pull_request', has_labels: ['bug', 'hotfix'] };
    expect(matchesCondition(condition, baseContext)).toBe(false);
  });

  test('does not match when has_labels but PR has no labels', () => {
    const condition: Condition = { event: 'pull_request', has_labels: 'bug' };
    expect(matchesCondition(condition, baseContext)).toBe(false);
  });

  test('does not match when has_labels but PR labels is empty array', () => {
    baseContext.labels = [];
    const condition: Condition = { event: 'pull_request', has_labels: 'bug' };
    expect(matchesCondition(condition, baseContext)).toBe(false);
  });

  test('matches complex condition with all fields', () => {
    const condition: Condition = {
      event: 'pull_request',
      action: 'opened',
      draft: false,
      merged: false,
    };
    expect(matchesCondition(condition, baseContext)).toBe(true);
  });

  test('does not match when one condition fails', () => {
    const condition: Condition = {
      event: 'pull_request',
      action: 'opened',
      draft: true, // This differs
      merged: false,
    };
    expect(matchesCondition(condition, baseContext)).toBe(false);
  });
});

describe('executeRules', () => {
  let baseContext: RuleContext;

  beforeEach(() => {
    infoSpy.mockClear();
    errorSpy.mockClear();
    warningSpy.mockClear();
    debugSpy.mockClear();

    baseContext = {
      eventName: 'pull_request',
      action: 'opened',
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
      hasAsanaTasks: true,
    };
  });

  test('executes matching rule', () => {
    const rules: Rule[] = [
      {
        when: { event: 'pull_request', action: 'opened' },
        then: { update_fields: { '1234': 'In Review' } },
      },
    ];

    const { fieldUpdates } = executeRules(rules, baseContext);

    expect(fieldUpdates.get('1234')).toBe('In Review');
    expect(core.debug).toHaveBeenCalledWith(expect.stringContaining('Rule 0: condition matched'));
  });

  test('skips non-matching rule', () => {
    const rules: Rule[] = [
      {
        when: { event: 'pull_request', action: 'closed' },
        then: { update_fields: { '1234': 'Done' } },
      },
    ];

    const { fieldUpdates } = executeRules(rules, baseContext);

    expect(fieldUpdates.size).toBe(0);
  });

  test('executes multiple matching rules', () => {
    const rules: Rule[] = [
      {
        when: { event: 'pull_request' },
        then: { update_fields: { '1234': 'In Review' } },
      },
      {
        when: { event: 'pull_request', action: 'opened' },
        then: { update_fields: { '5678': 'Active' } },
      },
    ];

    const { fieldUpdates } = executeRules(rules, baseContext);

    expect(fieldUpdates.get('1234')).toBe('In Review');
    expect(fieldUpdates.get('5678')).toBe('Active');
  });

  test('last rule wins for conflicting field', () => {
    const rules: Rule[] = [
      {
        when: { event: 'pull_request' },
        then: { update_fields: { '1234': 'First' } },
      },
      {
        when: { event: 'pull_request', action: 'opened' },
        then: { update_fields: { '1234': 'Second' } },
      },
    ];

    const { fieldUpdates } = executeRules(rules, baseContext);

    expect(fieldUpdates.get('1234')).toBe('Second');
  });

  test('evaluates template in field value', () => {
    const rules: Rule[] = [
      {
        when: { event: 'pull_request' },
        then: { update_fields: { '1234': 'PR-{{pr.number}}' } },
      },
    ];

    const { fieldUpdates } = executeRules(rules, baseContext);

    expect(fieldUpdates.get('1234')).toBe('PR-123');
  });

  test('sets mark_complete flag', () => {
    const rules: Rule[] = [
      {
        when: { event: 'pull_request' },
        then: { update_fields: { '1234': 'Done' }, mark_complete: true },
      },
    ];

    const { fieldUpdates } = executeRules(rules, baseContext);

    expect(fieldUpdates.get('__mark_complete')).toBe('true');
  });

  test('aggregates mark_complete from any rule', () => {
    const rules: Rule[] = [
      {
        when: { event: 'pull_request' },
        then: { update_fields: { '1234': 'In Review' } },
      },
      {
        when: { event: 'pull_request', action: 'opened' },
        then: { update_fields: { '5678': 'Active' }, mark_complete: true },
      },
    ];

    const { fieldUpdates } = executeRules(rules, baseContext);

    expect(fieldUpdates.get('__mark_complete')).toBe('true');
  });

  test('continues on template evaluation error', () => {
    const rules: Rule[] = [
      {
        when: { event: 'pull_request' },
        then: { update_fields: { '1234': '{{invalid{{syntax}}' } },
      },
    ];

    const { fieldUpdates } = executeRules(rules, baseContext);

    // Empty values are skipped, so the field won't be in the map
    expect(fieldUpdates.get('1234')).toBeUndefined();
    expect(core.error).toHaveBeenCalled(); // Error logged from evaluator
  });

  test('returns empty map when no rules match', () => {
    const rules: Rule[] = [
      {
        when: { event: 'issue_comment' },
        then: { update_fields: { '1234': 'Done' } },
      },
    ];

    const { fieldUpdates } = executeRules(rules, baseContext);

    expect(fieldUpdates.size).toBe(0);
  });
});

// ── Issues event support ──────────────────────────────────────────────────────

describe('matchesCondition - issues event', () => {
  let issueContext: RuleContext;

  beforeEach(() => {
    infoSpy.mockClear();
    errorSpy.mockClear();
    warningSpy.mockClear();
    debugSpy.mockClear();

    issueContext = {
      eventName: 'issues',
      action: 'opened',
      issue: {
        number: 42,
        title: 'Bug: something is broken',
        body: 'Steps to reproduce...',
        author: 'reporter',
        url: 'https://github.com/owner/repo/issues/42',
        state: 'open',
      },
      hasAsanaTasks: false,
    };
  });

  test('matches issues event', () => {
    const condition: Condition = { event: 'issues' };
    expect(matchesCondition(condition, issueContext)).toBe(true);
  });

  test('does not match pull_request condition against issues event', () => {
    const condition: Condition = { event: 'pull_request' };
    expect(matchesCondition(condition, issueContext)).toBe(false);
  });

  test('matches issues event with action', () => {
    const condition: Condition = { event: 'issues', action: 'opened' };
    expect(matchesCondition(condition, issueContext)).toBe(true);
  });

  test('does not match when action differs', () => {
    const condition: Condition = { event: 'issues', action: 'closed' };
    expect(matchesCondition(condition, issueContext)).toBe(false);
  });

  test('matches issues event with array of actions', () => {
    const condition: Condition = { event: 'issues', action: ['opened', 'reopened'] };
    expect(matchesCondition(condition, issueContext)).toBe(true);
  });

  test('matches issue author', () => {
    const condition: Condition = { event: 'issues', author: 'reporter' };
    expect(matchesCondition(condition, issueContext)).toBe(true);
  });

  test('does not match wrong author', () => {
    const condition: Condition = { event: 'issues', author: 'other' };
    expect(matchesCondition(condition, issueContext)).toBe(false);
  });

  test('matches author array including issue author', () => {
    const condition: Condition = { event: 'issues', author: ['reporter', 'admin'] };
    expect(matchesCondition(condition, issueContext)).toBe(true);
  });

  test('matches has_labels for issue labels', () => {
    issueContext = { ...issueContext, labels: ['bug', 'help wanted'] };
    const condition: Condition = { event: 'issues', has_labels: 'bug' };
    expect(matchesCondition(condition, issueContext)).toBe(true);
  });

  test('does not match has_labels when issue has no matching label', () => {
    issueContext = { ...issueContext, labels: ['enhancement'] };
    const condition: Condition = { event: 'issues', has_labels: 'bug' };
    expect(matchesCondition(condition, issueContext)).toBe(false);
  });

  test('matches has_asana_tasks: false for issue without Asana links', () => {
    const condition: Condition = { event: 'issues', has_asana_tasks: false };
    expect(matchesCondition(condition, issueContext)).toBe(true);
  });

  test('does not match merged condition for issues event (PR-only condition)', () => {
    const condition: Condition = { event: 'issues', merged: false };
    expect(matchesCondition(condition, issueContext)).toBe(false);
  });

  test('does not match draft condition for issues event (PR-only condition)', () => {
    const condition: Condition = { event: 'issues', draft: false };
    expect(matchesCondition(condition, issueContext)).toBe(false);
  });

  test('label condition matches from labeled event', () => {
    issueContext = { ...issueContext, label: { name: 'bug' } };
    const condition: Condition = { event: 'issues', label: 'bug' };
    expect(matchesCondition(condition, issueContext)).toBe(true);
  });
});

describe('executeRules - issues event', () => {
  let issueContext: RuleContext;

  beforeEach(() => {
    infoSpy.mockClear();
    errorSpy.mockClear();
    warningSpy.mockClear();
    debugSpy.mockClear();

    issueContext = {
      eventName: 'issues',
      action: 'opened',
      issue: {
        number: 42,
        title: 'Bug: something is broken',
        body: 'Steps to reproduce...',
        author: 'reporter',
        url: 'https://github.com/owner/repo/issues/42',
        state: 'open',
      },
      hasAsanaTasks: false,
    };
  });

  test('evaluates issue template variables', () => {
    const rules: Rule[] = [
      {
        when: { event: 'issues', has_asana_tasks: false },
        then: {
          create_task: {
            project: '111222333',
            workspace: '444555666',
            title: 'GH Issue #{{issue.number}}: {{issue.title}}',
          },
        },
      },
    ];

    const { taskCreationSpecs } = executeRules(rules, issueContext);

    expect(taskCreationSpecs).toHaveLength(1);
    expect(taskCreationSpecs[0]!.evaluatedTitle).toBe('GH Issue #42: Bug: something is broken');
  });

  test('issue author is accessible in templates', () => {
    const rules: Rule[] = [
      {
        when: { event: 'issues' },
        then: { update_fields: { '1234': '{{issue.author}}' } },
      },
    ];

    // has_asana_tasks: true required for update_fields — adjust context
    const ctx = { ...issueContext, hasAsanaTasks: true };
    const { fieldUpdates } = executeRules(rules, ctx);

    expect(fieldUpdates.get('1234')).toBe('reporter');
  });

  test('issue url is accessible in templates', () => {
    const rules: Rule[] = [
      {
        when: { event: 'issues' },
        then: { update_fields: { '9999': '{{issue.url}}' } },
      },
    ];

    const ctx = { ...issueContext, hasAsanaTasks: true };
    const { fieldUpdates } = executeRules(rules, ctx);

    expect(fieldUpdates.get('9999')).toBe('https://github.com/owner/repo/issues/42');
  });

  test('PR rules do not fire on issues event', () => {
    const rules: Rule[] = [
      {
        when: { event: 'pull_request', action: 'opened' },
        then: { update_fields: { '1234': 'In Review' } },
      },
    ];

    const ctx = { ...issueContext, hasAsanaTasks: true };
    const { fieldUpdates } = executeRules(rules, ctx);

    expect(fieldUpdates.size).toBe(0);
  });
});

describe('buildRuleContext - issues event', () => {
  beforeEach(() => {
    infoSpy.mockClear();
    errorSpy.mockClear();
    warningSpy.mockClear();
    debugSpy.mockClear();
  });

  const makeIssuePayload = (overrides: Record<string, unknown> = {}) => ({
    eventName: 'issues' as const,
    payload: {
      action: 'opened',
      issue: {
        number: 42,
        title: 'Bug: something is broken',
        body: 'Steps to reproduce...',
        user: { login: 'reporter' },
        assignee: null,
        html_url: 'https://github.com/owner/repo/issues/42',
        state: 'open',
        labels: [{ name: 'bug' }, { name: 'help wanted' }],
        ...overrides,
      },
    },
  });

  test('builds issue context from issues payload', () => {
    const ctx = buildRuleContext(makeIssuePayload(), undefined, false);

    expect(ctx.eventName).toBe('issues');
    expect(ctx.action).toBe('opened');
    expect(ctx.issue).toBeDefined();
    expect(ctx.issue!.number).toBe(42);
    expect(ctx.issue!.title).toBe('Bug: something is broken');
    expect(ctx.issue!.author).toBe('reporter');
    expect(ctx.issue!.state).toBe('open');
    expect(ctx.issue!.url).toBe('https://github.com/owner/repo/issues/42');
    expect(ctx.pr).toBeUndefined();
  });

  test('extracts labels from issue payload', () => {
    const ctx = buildRuleContext(makeIssuePayload(), undefined, false);

    expect(ctx.labels).toEqual(['bug', 'help wanted']);
  });

  test('sets hasAsanaTasks from caller', () => {
    const ctx = buildRuleContext(makeIssuePayload(), undefined, true);
    expect(ctx.hasAsanaTasks).toBe(true);
  });

  test('includes assignee when present', () => {
    const ctx = buildRuleContext(
      makeIssuePayload({ assignee: { login: 'maintainer' } }),
      undefined,
      false
    );
    expect(ctx.issue!.assignee).toBe('maintainer');
  });

  test('sets assignee to undefined when null', () => {
    const ctx = buildRuleContext(makeIssuePayload({ assignee: null }), undefined, false);
    expect(ctx.issue!.assignee).toBeUndefined();
  });

  test('handles empty issue body', () => {
    const ctx = buildRuleContext(makeIssuePayload({ body: null }), undefined, false);
    expect(ctx.issue!.body).toBe('');
  });

  test('extracts label from labeled event', () => {
    const payload = {
      ...makeIssuePayload(),
      payload: {
        ...makeIssuePayload().payload,
        label: { name: 'critical' },
      },
    };
    const ctx = buildRuleContext(payload, undefined, false);
    expect(ctx.label).toEqual({ name: 'critical' });
  });

  test('throws for unsupported event', () => {
    expect(() =>
      buildRuleContext({ eventName: 'push', payload: {} }, undefined, false)
    ).toThrow('Unsupported event: push');
  });

  test('throws when issue missing from issues payload', () => {
    expect(() =>
      buildRuleContext({ eventName: 'issues', payload: { action: 'opened' } }, undefined, false)
    ).toThrow('No issue in GitHub payload');
  });
});
