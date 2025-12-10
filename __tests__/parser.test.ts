/**
 * Tests for parser module
 */

import { extractAsanaTaskIds } from '../src/util/parser';

describe('extractAsanaTaskIds', () => {
  it('should extract single task ID from PR body', () => {
    const body = 'Fixes issue described in https://app.asana.com/0/1234567890/9876543210';
    const result = extractAsanaTaskIds(body);
    expect(result).toEqual({ taskIds: ['9876543210'], changed: true });
  });

  it('should extract multiple task IDs from PR body', () => {
    const body = `
      Related to https://app.asana.com/0/1234567890/1111111111
      Also fixes https://app.asana.com/0/9999999999/2222222222
    `;
    const result = extractAsanaTaskIds(body);
    expect(result).toEqual({ taskIds: ['1111111111', '2222222222'], changed: true });
  });

  it('should deduplicate task IDs', () => {
    const body = `
      Task: https://app.asana.com/0/1234567890/9876543210
      Same task: https://app.asana.com/0/1234567890/9876543210
    `;
    const result = extractAsanaTaskIds(body);
    expect(result).toEqual({ taskIds: ['9876543210'], changed: true });
  });

  it('should skip malformed URLs', () => {
    const body = `
      Valid: https://app.asana.com/0/1234567890/9876543210
      Malformed: https://app.asana.com/0/invalid
      Another valid: https://app.asana.com/0/1111111111/2222222222
    `;
    const result = extractAsanaTaskIds(body);
    expect(result).toEqual({ taskIds: ['9876543210', '2222222222'], changed: true });
  });

  it('should return empty array for undefined body', () => {
    const result = extractAsanaTaskIds(undefined);
    expect(result).toEqual({ taskIds: [], changed: true });
  });

  it('should return empty array for empty body', () => {
    const result = extractAsanaTaskIds('');
    expect(result).toEqual({ taskIds: [], changed: true });
  });

  it('should return empty array when no Asana URLs found', () => {
    const body = 'This PR has no Asana links at all';
    const result = extractAsanaTaskIds(body);
    expect(result).toEqual({ taskIds: [], changed: true });
  });

  it('should extract task ID from long-form URL with project path', () => {
    const body = 'Related to https://app.asana.com/1/1202585680506197/project/1207308952015558/task/1210723244258078';
    const result = extractAsanaTaskIds(body);
    expect(result).toEqual({ taskIds: ['1210723244258078'], changed: true });
  });

  it('should extract task IDs from mixed URL formats', () => {
    const body = `
      Short format: https://app.asana.com/0/0/1211770387762076
      Long format: https://app.asana.com/1/1202585680506197/project/1207308952015558/task/1210723244258078
    `;
    const result = extractAsanaTaskIds(body);
    expect(result).toEqual({ taskIds: ['1211770387762076', '1210723244258078'], changed: true });
  });

  it('should deduplicate task IDs across different URL formats', () => {
    const body = `
      Short: https://app.asana.com/0/0/9876543210
      Long: https://app.asana.com/1/1234567890/project/1111111111/task/9876543210
    `;
    const result = extractAsanaTaskIds(body);
    expect(result).toEqual({ taskIds: ['9876543210'], changed: true });
  });

  it('should extract task IDs from URLs with query parameters', () => {
    const body = `
      With focus: https://app.asana.com/0/0/1234567890?focus=true
      With multiple params: https://app.asana.com/1/1111111111/project/2222222222/task/3333333333?foo=bar&baz=qux
    `;
    const result = extractAsanaTaskIds(body);
    expect(result).toEqual({ taskIds: ['1234567890', '3333333333'], changed: true });
  });

  it('should handle URLs at end of sentences with punctuation', () => {
    const body = `
      See task https://app.asana.com/0/0/1234567890.
      Check this: https://app.asana.com/0/0/9876543210!
    `;
    const result = extractAsanaTaskIds(body);
    expect(result).toEqual({ taskIds: ['1234567890', '9876543210'], changed: true });
  });

  describe('with previousBody', () => {
    it('should detect when task IDs changed (different IDs)', () => {
      const body = 'Task: https://app.asana.com/0/0/1111111111';
      const previousBody = 'Task: https://app.asana.com/0/0/2222222222';
      const result = extractAsanaTaskIds(body, previousBody);
      expect(result).toEqual({ taskIds: ['1111111111'], changed: true });
    });

    it('should detect when task IDs changed (added ID)', () => {
      const body = 'Tasks: https://app.asana.com/0/0/1111111111 and https://app.asana.com/0/0/2222222222';
      const previousBody = 'Task: https://app.asana.com/0/0/1111111111';
      const result = extractAsanaTaskIds(body, previousBody);
      expect(result).toEqual({ taskIds: ['1111111111', '2222222222'], changed: true });
    });

    it('should detect when task IDs changed (removed ID)', () => {
      const body = 'Task: https://app.asana.com/0/0/1111111111';
      const previousBody = 'Tasks: https://app.asana.com/0/0/1111111111 and https://app.asana.com/0/0/2222222222';
      const result = extractAsanaTaskIds(body, previousBody);
      expect(result).toEqual({ taskIds: ['1111111111'], changed: true });
    });

    it('should detect no change when task IDs are the same', () => {
      const body = 'Task: https://app.asana.com/0/0/1111111111';
      const previousBody = 'Task: https://app.asana.com/0/0/1111111111';
      const result = extractAsanaTaskIds(body, previousBody);
      expect(result).toEqual({ taskIds: ['1111111111'], changed: false });
    });

    it('should detect no change when multiple task IDs are the same (different order)', () => {
      const body = 'Tasks: https://app.asana.com/0/0/1111111111 and https://app.asana.com/0/0/2222222222';
      const previousBody = 'Tasks: https://app.asana.com/0/0/2222222222 and https://app.asana.com/0/0/1111111111';
      const result = extractAsanaTaskIds(body, previousBody);
      expect(result.changed).toBe(false);
      // taskIds should be in the order they appear in body
      expect(result.taskIds).toEqual(['1111111111', '2222222222']);
    });

    it('should detect change when going from IDs to no IDs', () => {
      const body = 'No tasks mentioned';
      const previousBody = 'Task: https://app.asana.com/0/0/1111111111';
      const result = extractAsanaTaskIds(body, previousBody);
      expect(result).toEqual({ taskIds: [], changed: true });
    });

    it('should detect change when going from no IDs to IDs', () => {
      const body = 'Task: https://app.asana.com/0/0/1111111111';
      const previousBody = 'No tasks mentioned';
      const result = extractAsanaTaskIds(body, previousBody);
      expect(result).toEqual({ taskIds: ['1111111111'], changed: true });
    });

    it('should detect no change when both have no IDs', () => {
      const body = 'No tasks mentioned here';
      const previousBody = 'No tasks here either';
      const result = extractAsanaTaskIds(body, previousBody);
      expect(result).toEqual({ taskIds: [], changed: false });
    });

    it('should handle undefined previousBody as changed', () => {
      const body = 'Task: https://app.asana.com/0/0/1111111111';
      const result = extractAsanaTaskIds(body, undefined);
      expect(result).toEqual({ taskIds: ['1111111111'], changed: true });
    });
  });
});