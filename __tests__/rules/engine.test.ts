/**
 * Tests for rules engine
 */

import * as core from '@actions/core';
import { matchesCondition, executeRules, RuleContext } from '../../src/rules/engine';
import { Rule, Condition } from '../../src/rules/types';

// Mock @actions/core
jest.mock('@actions/core');

describe('matchesCondition', () => {
  let baseContext: RuleContext;

  beforeEach(() => {
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
    baseContext.pr.merged = true;
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
    baseContext.pr.draft = true;
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
    jest.clearAllMocks();

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
    };
  });

  test('executes matching rule', () => {
    const rules: Rule[] = [
      {
        when: { event: 'pull_request', action: 'opened' },
        then: { update_fields: { '1234': 'In Review' } },
      },
    ];

    const updates = executeRules(rules, baseContext);

    expect(updates.get('1234')).toBe('In Review');
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Rule 0: condition matched'));
  });

  test('skips non-matching rule', () => {
    const rules: Rule[] = [
      {
        when: { event: 'pull_request', action: 'closed' },
        then: { update_fields: { '1234': 'Done' } },
      },
    ];

    const updates = executeRules(rules, baseContext);

    expect(updates.size).toBe(0);
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

    const updates = executeRules(rules, baseContext);

    expect(updates.get('1234')).toBe('In Review');
    expect(updates.get('5678')).toBe('Active');
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

    const updates = executeRules(rules, baseContext);

    expect(updates.get('1234')).toBe('Second');
  });

  test('evaluates template in field value', () => {
    const rules: Rule[] = [
      {
        when: { event: 'pull_request' },
        then: { update_fields: { '1234': 'PR-{{pr.number}}' } },
      },
    ];

    const updates = executeRules(rules, baseContext);

    expect(updates.get('1234')).toBe('PR-123');
  });

  test('sets mark_complete flag', () => {
    const rules: Rule[] = [
      {
        when: { event: 'pull_request' },
        then: { update_fields: { '1234': 'Done' }, mark_complete: true },
      },
    ];

    const updates = executeRules(rules, baseContext);

    expect(updates.get('__mark_complete')).toBe('true');
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

    const updates = executeRules(rules, baseContext);

    expect(updates.get('__mark_complete')).toBe('true');
  });

  test('continues on template evaluation error', () => {
    const rules: Rule[] = [
      {
        when: { event: 'pull_request' },
        then: { update_fields: { '1234': '{{invalid{{syntax}}' } },
      },
    ];

    const updates = executeRules(rules, baseContext);

    expect(updates.get('1234')).toBe('');
    expect(core.error).toHaveBeenCalled(); // Error logged from evaluator
  });

  test('returns empty map when no rules match', () => {
    const rules: Rule[] = [
      {
        when: { event: 'issue_comment' },
        then: { update_fields: { '1234': 'Done' } },
      },
    ];

    const updates = executeRules(rules, baseContext);

    expect(updates.size).toBe(0);
  });
});
