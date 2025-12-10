/**
 * Tests for custom error types
 */

import { describe, test, expect } from 'bun:test';
import { ApiError, isApiError } from '../../src/util/errors';

describe('ApiError', () => {
  test('creates ApiError with message and status', () => {
    const error = new ApiError('Test error', 404);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test error');
    expect(error.status).toBe(404);
    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('ApiError');
  });

  test('creates ApiError with body', () => {
    const body = JSON.stringify({ errors: [{ message: 'Not found' }] });
    const error = new ApiError('Not found', 404, body);
    expect(error.body).toBe(body);
    expect(error.status).toBe(404);
  });

  test('creates ApiError without body', () => {
    const error = new ApiError('Server error', 500);
    expect(error.body).toBeUndefined();
  });

  test('ApiError has both status and statusCode set to same value', () => {
    const error = new ApiError('Test', 429);
    expect(error.status).toBe(429);
    expect(error.statusCode).toBe(429);
    expect(error.status).toBe(error.statusCode);
  });

  test('ApiError message is accessible', () => {
    const error = new ApiError('Custom message', 500);
    expect(error.message).toBe('Custom message');
    expect(error.toString()).toContain('Custom message');
  });

  test('ApiError can be thrown and caught', () => {
    expect(() => {
      throw new ApiError('Test error', 400);
    }).toThrow('Test error');
  });

  test('ApiError preserves stack trace', () => {
    const error = new ApiError('Test', 500);
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('ApiError');
  });
});

describe('isApiError', () => {
  test('returns true for ApiError instances', () => {
    const error = new ApiError('Test', 404);
    expect(isApiError(error)).toBe(true);
  });

  test('returns false for regular Error', () => {
    const error = new Error('Regular error');
    expect(isApiError(error)).toBe(false);
  });

  test('returns false for non-error objects', () => {
    expect(isApiError({})).toBe(false);
    expect(isApiError({ status: 404 })).toBe(false);
    expect(isApiError({ message: 'error' })).toBe(false);
  });

  test('returns false for null', () => {
    expect(isApiError(null)).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(isApiError(undefined)).toBe(false);
  });

  test('returns false for strings', () => {
    expect(isApiError('error string')).toBe(false);
  });

  test('returns false for numbers', () => {
    expect(isApiError(404)).toBe(false);
  });

  test('distinguishes ApiError from Error with status property', () => {
    const regularError: any = new Error('Test');
    regularError.status = 404;
    expect(isApiError(regularError)).toBe(false);
  });

  test('works in catch blocks', () => {
    try {
      throw new ApiError('Test', 500);
    } catch (error) {
      expect(isApiError(error)).toBe(true);
      if (isApiError(error)) {
        expect(error.status).toBe(500);
      }
    }
  });

  test('type narrows correctly', () => {
    const error: unknown = new ApiError('Test', 404);
    if (isApiError(error)) {
      // TypeScript should know error is ApiError here
      expect(error.status).toBe(404);
      expect(error.statusCode).toBe(404);
      expect(error.body).toBeUndefined();
    }
  });
});
