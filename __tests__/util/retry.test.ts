/**
 * Tests for retry utility with exponential backoff
 */

import { describe, test, expect, beforeEach, spyOn } from 'bun:test';
import { withRetry } from '../../src/util/retry';
import { ApiError } from '../../src/util/errors';
import * as core from '@actions/core';

// Create spies for @actions/core
const warningSpy = spyOn(core, 'warning').mockImplementation(() => {});
const debugSpy = spyOn(core, 'debug').mockImplementation(() => {});

describe('Retry Utility', () => {
  beforeEach(() => {
    warningSpy.mockClear();
    debugSpy.mockClear();
  });

  describe('withRetry - successful operations', () => {
    test('returns result immediately on success', async () => {
      const operation = async () => 'success';
      const result = await withRetry(operation, 'test operation');
      expect(result).toBe('success');
    });

    test('succeeds on second attempt after retryable error', async () => {
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new ApiError('Rate limited', 429);
        }
        return 'success';
      };

      const result = await withRetry(operation, 'test operation');
      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
      // Note: @lifeomic/attempt uses 0-based attemptNum, so first retry logs "Attempt 0/3 failed"
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('Attempt 0/3 failed for test operation')
      );
    });

    test('succeeds on third attempt after multiple retryable errors', async () => {
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new ApiError('Server error', 500);
        }
        return 'success';
      };

      const result = await withRetry(operation, 'test operation');
      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });
  });

  describe('withRetry - ApiError handling', () => {
    test('retries on 429 rate limit error', async () => {
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new ApiError('Rate limited', 429);
        }
        return 'success';
      };

      const result = await withRetry(operation, 'test operation');
      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });

    test('retries on 500 server error', async () => {
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new ApiError('Internal server error', 500);
        }
        return 'success';
      };

      const result = await withRetry(operation, 'test operation');
      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });

    test('retries on 502 bad gateway', async () => {
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new ApiError('Bad gateway', 502);
        }
        return 'success';
      };

      const result = await withRetry(operation, 'test operation');
      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });

    test('retries on 503 service unavailable', async () => {
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          throw new ApiError('Service unavailable', 503);
        }
        return 'success';
      };

      const result = await withRetry(operation, 'test operation');
      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });

    test('does not retry on 400 bad request', async () => {
      const operation = async () => {
        throw new ApiError('Bad request', 400);
      };

      await expect(withRetry(operation, 'test operation')).rejects.toThrow('Bad request');
    });

    test('does not retry on 401 unauthorized', async () => {
      const operation = async () => {
        throw new ApiError('Unauthorized', 401);
      };

      await expect(withRetry(operation, 'test operation')).rejects.toThrow('Unauthorized');
    });

    test('does not retry on 403 forbidden', async () => {
      const operation = async () => {
        throw new ApiError('Forbidden', 403);
      };

      await expect(withRetry(operation, 'test operation')).rejects.toThrow('Forbidden');
    });

    test('does not retry on 404 not found', async () => {
      const operation = async () => {
        throw new ApiError('Not found', 404);
      };

      await expect(withRetry(operation, 'test operation')).rejects.toThrow('Not found');
    });

    test('does not retry on 409 conflict', async () => {
      const operation = async () => {
        throw new ApiError('Conflict', 409);
      };

      await expect(withRetry(operation, 'test operation')).rejects.toThrow('Conflict');
    });
  });

  describe('withRetry - generic error handling', () => {
    test('retries on error with status 429', async () => {
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          const error: any = new Error('Rate limited');
          error.status = 429;
          throw error;
        }
        return 'success';
      };

      const result = await withRetry(operation, 'test operation');
      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });

    test('retries on error with statusCode 500', async () => {
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          const error: any = new Error('Server error');
          error.statusCode = 500;
          throw error;
        }
        return 'success';
      };

      const result = await withRetry(operation, 'test operation');
      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });

    test('retries on error with nested response.status 500', async () => {
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          const error: any = new Error('Server error');
          error.response = { status: 500 };
          throw error;
        }
        return 'success';
      };

      const result = await withRetry(operation, 'test operation');
      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });

    test('does not retry on error with status 400', async () => {
      const operation = async () => {
        const error: any = new Error('Bad request');
        error.status = 400;
        throw error;
      };

      await expect(withRetry(operation, 'test operation')).rejects.toThrow('Bad request');
    });
  });

  describe('withRetry - network error handling', () => {
    test('retries on ECONNRESET network error', async () => {
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          const error: any = new Error('Connection reset');
          error.code = 'ECONNRESET';
          throw error;
        }
        return 'success';
      };

      const result = await withRetry(operation, 'test operation');
      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });

    test('retries on ETIMEDOUT network error', async () => {
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          const error: any = new Error('Timeout');
          error.code = 'ETIMEDOUT';
          throw error;
        }
        return 'success';
      };

      const result = await withRetry(operation, 'test operation');
      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });

    test('retries on ENOTFOUND network error', async () => {
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          const error: any = new Error('Not found');
          error.code = 'ENOTFOUND';
          throw error;
        }
        return 'success';
      };

      const result = await withRetry(operation, 'test operation');
      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });

    test('retries on ENETUNREACH network error', async () => {
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          const error: any = new Error('Network unreachable');
          error.code = 'ENETUNREACH';
          throw error;
        }
        return 'success';
      };

      const result = await withRetry(operation, 'test operation');
      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });

    test('retries on EAI_AGAIN network error', async () => {
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 2) {
          const error: any = new Error('DNS lookup failed');
          error.code = 'EAI_AGAIN';
          throw error;
        }
        return 'success';
      };

      const result = await withRetry(operation, 'test operation');
      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });

    test('does not retry on unknown error code', async () => {
      const operation = async () => {
        const error: any = new Error('Unknown error');
        error.code = 'UNKNOWN_CODE';
        throw error;
      };

      await expect(withRetry(operation, 'test operation')).rejects.toThrow('Unknown error');
    });
  });

  describe('withRetry - error logging', () => {
    test('logs warning messages for retry attempts', async () => {
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new ApiError('Server error', 500);
        }
        return 'success';
      };

      await withRetry(operation, 'my operation');
      // @lifeomic/attempt uses 0-based attemptNum
      // Attempt 0 fails, logs "Attempt 0/3 failed"
      // Attempt 1 fails, logs "Attempt 1/3 failed"
      // Attempt 2 succeeds, logs "Retry attempt 2/3"
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('Attempt 0/3 failed for my operation: Server error')
      );
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('Attempt 1/3 failed for my operation: Server error')
      );
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('Retry attempt 2/3 for my operation')
      );
    });

    test('logs debug for non-retryable errors', async () => {
      const operation = async () => {
        throw new ApiError('Bad request', 400);
      };

      await expect(withRetry(operation, 'test operation')).rejects.toThrow();
      expect(core.debug).toHaveBeenCalledWith(
        expect.stringContaining('Non-retryable error for test operation')
      );
    });
  });

  describe('withRetry - max attempts', () => {
    test('throws after max attempts exhausted', async () => {
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        throw new ApiError('Server error', 500);
      };

      await expect(withRetry(operation, 'test operation')).rejects.toThrow('Server error');
      expect(attemptCount).toBe(3); // maxAttempts = 3
    });

    test('does not attempt more than max attempts', async () => {
      let attemptCount = 0;
      const operation = async () => {
        attemptCount++;
        throw new ApiError('Rate limited', 429);
      };

      await expect(withRetry(operation, 'test operation')).rejects.toThrow();
      expect(attemptCount).toBeLessThanOrEqual(3);
    });
  });

  describe('withRetry - error without message', () => {
    test('handles errors without status or code', async () => {
      const operation = async () => {
        throw new Error('Generic error');
      };

      await expect(withRetry(operation, 'test operation')).rejects.toThrow('Generic error');
    });

    test('handles non-Error objects', async () => {
      const operation = async () => {
        throw 'string error';
      };

      await expect(withRetry(operation, 'test operation')).rejects.toBe('string error');
    });

    test('handles null errors', async () => {
      const operation = async () => {
        throw null;
      };

      await expect(withRetry(operation, 'test operation')).rejects.toBeNull();
    });
  });
});
