/**
 * Integration test: v1 behavior with v2 rules engine
 *
 * Simulates v1 simple mode using v2 rules:
 * - PR opened → "In Review"
 * - PR merged → "Shipped" + mark complete
 */

import { describe, test, expect, beforeEach, spyOn, mock } from 'bun:test';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { readRulesConfig } from '../../src/util/config';
import { validateRulesConfig } from '../../src/rules/validator';
import { buildRuleContext, executeRules } from '../../src/rules/engine';

// Create spies for @actions/core
const infoSpy = spyOn(core, 'info').mockImplementation(() => {});
const errorSpy = spyOn(core, 'error').mockImplementation(() => {});
const warningSpy = spyOn(core, 'warning').mockImplementation(() => {});
const debugSpy = spyOn(core, 'debug').mockImplementation(() => {});

// Mock @actions/github
mock.module('@actions/github', () => ({
  context: {
    eventName: 'pull_request',
    payload: {
      action: 'opened',
      pull_request: {
        number: 123,
        title: 'Test PR',
        body: 'https://app.asana.com/0/1234567890/9876543210',
        merged: false,
        draft: false,
        user: { login: 'testuser' },
        base: { ref: 'main' },
        head: { ref: 'feature' },
        html_url: 'https://github.com/owner/repo/pull/123',
      },
    },
  },
}));

describe('v1 Compatibility with v2 Rules', () => {
  const v1EquivalentRules = `
rules:
  - when:
      event: pull_request
      action: opened
      draft: false
    then:
      update_fields:
        '1234567890': 'In Review'

  - when:
      event: pull_request
      action: closed
      merged: true
    then:
      update_fields:
        '1234567890': 'Shipped'
      mark_complete: true
`;

  beforeEach(() => {
    infoSpy.mockClear();
    errorSpy.mockClear();
    warningSpy.mockClear();
    debugSpy.mockClear();

    // Mock core.getInput to return test configuration
    spyOn(core, 'getInput').mockImplementation((name: string) => {
      if (name === 'asana_token') return 'test_token_123';
      if (name === 'github_token') return 'ghp_test_token';
      if (name === 'rules') return v1EquivalentRules;
      return '';
    });
  });

  test('PR opened sets status to In Review', () => {
    // Parse rules
    const { rules } = readRulesConfig();
    validateRulesConfig(rules);

    // Build context (PR opened)
    const context = buildRuleContext(github.context);

    // Execute rules
    const { fieldUpdates } = executeRules(rules.rules, context);

    // Verify field updates
    expect(fieldUpdates.size).toBe(1);
    expect(fieldUpdates.get('1234567890')).toBe('In Review');
    expect(fieldUpdates.has('__mark_complete')).toBe(false);
  });

  test('PR merged sets status to Shipped and marks complete', () => {
    // Mock merged PR
    const mergedContext = {
      eventName: 'pull_request',
      payload: {
        action: 'closed',
        pull_request: {
          number: 123,
          title: 'Test PR',
          body: 'https://app.asana.com/0/1234567890/9876543210',
          merged: true,
          draft: false,
          user: { login: 'testuser' },
          base: { ref: 'main' },
          head: { ref: 'feature' },
          html_url: 'https://github.com/owner/repo/pull/123',
        },
      },
    };

    // Parse rules
    const { rules } = readRulesConfig();
    validateRulesConfig(rules);

    // Build context (PR merged)
    const context = buildRuleContext(mergedContext);

    // Execute rules
    const { fieldUpdates } = executeRules(rules.rules, context);

    // Verify field updates
    expect(fieldUpdates.size).toBe(2);
    expect(fieldUpdates.get('1234567890')).toBe('Shipped');
    expect(fieldUpdates.get('__mark_complete')).toBe('true');
  });

  test('draft PR does not match opened rule', () => {
    // Mock draft PR
    const draftContext = {
      eventName: 'pull_request',
      payload: {
        action: 'opened',
        pull_request: {
          number: 123,
          title: 'Test PR',
          body: 'https://app.asana.com/0/1234567890/9876543210',
          merged: false,
          draft: true,
          user: { login: 'testuser' },
          base: { ref: 'main' },
          head: { ref: 'feature' },
          html_url: 'https://github.com/owner/repo/pull/123',
        },
      },
    };

    // Parse rules
    const { rules } = readRulesConfig();
    validateRulesConfig(rules);

    // Build context (draft PR)
    const context = buildRuleContext(draftContext);

    // Execute rules
    const { fieldUpdates } = executeRules(rules.rules, context);

    // No rules should match
    expect(fieldUpdates.size).toBe(0);
  });

  test('supports template interpolation in field values', () => {
    const rulesWithTemplate = `
rules:
  - when:
      event: pull_request
      action: opened
    then:
      update_fields:
        '1234567890': 'PR-{{pr.number}}: {{pr.title}}'
`;

    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      if (name === 'asana_token') return 'test_token_123';
      if (name === 'github_token') return 'ghp_test_token';
      if (name === 'rules') return rulesWithTemplate;
      return '';
    });

    // Parse rules
    const { rules } = readRulesConfig();
    validateRulesConfig(rules);

    // Build context
    const context = buildRuleContext(github.context);

    // Execute rules
    const { fieldUpdates } = executeRules(rules.rules, context);

    // Verify template was evaluated
    expect(fieldUpdates.size).toBe(1);
    expect(fieldUpdates.get('1234567890')).toBe('PR-123: Test PR');
  });
});
