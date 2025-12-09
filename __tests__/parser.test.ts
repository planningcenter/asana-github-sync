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
});