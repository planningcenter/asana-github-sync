/**
 * Tests for Handlebars evaluator
 */

import * as core from '@actions/core';
import { evaluateTemplate } from '../../src/expression/evaluator';
import { HandlebarsContext } from '../../src/expression/context';

// Mock @actions/core
jest.mock('@actions/core');

describe('evaluateTemplate', () => {
  let mockContext: HandlebarsContext;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create standard test context
    mockContext = {
      pr: {
        number: 123,
        title: 'Test PR Title',
        body: 'Test PR body with BUILD-456',
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
    };
  });

  test('evaluates text-only template', () => {
    const result = evaluateTemplate('Hello World', mockContext);
    expect(result).toBe('Hello World');
  });

  test('evaluates simple interpolation', () => {
    const result = evaluateTemplate('PR #{{pr.number}}', mockContext);
    expect(result).toBe('PR #123');
  });

  test('evaluates multiple interpolations', () => {
    const result = evaluateTemplate('{{pr.author}} opened PR #{{pr.number}}', mockContext);
    expect(result).toBe('testuser opened PR #123');
  });

  test('evaluates nested property access', () => {
    const result = evaluateTemplate('Event: {{event.name}}/{{event.action}}', mockContext);
    expect(result).toBe('Event: pull_request/opened');
  });

  test('evaluates boolean values', () => {
    const result = evaluateTemplate('Merged: {{pr.merged}}, Draft: {{pr.draft}}', mockContext);
    expect(result).toBe('Merged: false, Draft: false');
  });

  test('evaluates merged PR', () => {
    mockContext.pr.merged = true;
    const result = evaluateTemplate('Merged: {{pr.merged}}', mockContext);
    expect(result).toBe('Merged: true');
  });

  test('handles missing properties gracefully', () => {
    const result = evaluateTemplate('Label: {{label.name}}', mockContext);
    // With strict: false, missing properties return empty string
    expect(result).toBe('Label: ');
  });

  test('handles label context when present', () => {
    mockContext.label = { name: 'bug' };
    const result = evaluateTemplate('Label: {{label.name}}', mockContext);
    expect(result).toBe('Label: bug');
  });

  test('preserves whitespace', () => {
    const result = evaluateTemplate('  Build-{{pr.number}}  ', mockContext);
    expect(result).toBe('  Build-123  ');
  });

  test('returns empty string on invalid template syntax', () => {
    const result = evaluateTemplate('{{invalid{{nested}}syntax}}', mockContext);
    expect(result).toBe('');
    expect(core.error).toHaveBeenCalledWith(expect.stringContaining('Template evaluation failed'));
  });

  test('logs error details on failure', () => {
    evaluateTemplate('{{invalid{{nested}}syntax}}', mockContext);

    expect(core.error).toHaveBeenCalledWith(expect.stringContaining('Template evaluation failed'));
    expect(core.debug).toHaveBeenCalledWith(expect.stringContaining('Template:'));
    expect(core.debug).toHaveBeenCalledWith(expect.stringContaining('Context:'));
  });

  test('handles empty template', () => {
    const result = evaluateTemplate('', mockContext);
    expect(result).toBe('');
  });

  test('handles template with only whitespace', () => {
    const result = evaluateTemplate('   ', mockContext);
    expect(result).toBe('   ');
  });
});
