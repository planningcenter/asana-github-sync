/**
 * Tests for parser module
 */

import { extractAsanaTaskIds } from '../src/parser';

describe('extractAsanaTaskIds', () => {
  it('should extract single task ID from PR body', () => {
    const body = 'Fixes issue described in https://app.asana.com/0/1234567890/9876543210';
    const result = extractAsanaTaskIds(body);
    expect(result).toEqual(['9876543210']);
  });

  it('should extract multiple task IDs from PR body', () => {
    const body = `
      Related to https://app.asana.com/0/1234567890/1111111111
      Also fixes https://app.asana.com/0/9999999999/2222222222
    `;
    const result = extractAsanaTaskIds(body);
    expect(result).toEqual(['1111111111', '2222222222']);
  });

  it('should deduplicate task IDs', () => {
    const body = `
      Task: https://app.asana.com/0/1234567890/9876543210
      Same task: https://app.asana.com/0/1234567890/9876543210
    `;
    const result = extractAsanaTaskIds(body);
    expect(result).toEqual(['9876543210']);
  });

  it('should skip malformed URLs', () => {
    const body = `
      Valid: https://app.asana.com/0/1234567890/9876543210
      Malformed: https://app.asana.com/0/invalid
      Another valid: https://app.asana.com/0/1111111111/2222222222
    `;
    const result = extractAsanaTaskIds(body);
    expect(result).toEqual(['9876543210', '2222222222']);
  });

  it('should return empty array for null body', () => {
    const result = extractAsanaTaskIds(null);
    expect(result).toEqual([]);
  });

  it('should return empty array for empty body', () => {
    const result = extractAsanaTaskIds('');
    expect(result).toEqual([]);
  });

  it('should return empty array when no Asana URLs found', () => {
    const body = 'This PR has no Asana links at all';
    const result = extractAsanaTaskIds(body);
    expect(result).toEqual([]);
  });
});