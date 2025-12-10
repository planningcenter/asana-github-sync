/**
 * Tests for Asana task fetching operations
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach, afterAll, spyOn } from 'bun:test';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  fetchTaskDetails,
  fetchAllTaskDetails,
  checkIfPRAlreadyLinked,
} from '../../src/util/asana/tasks';
import * as core from '@actions/core';

// Create spies for @actions/core
const infoSpy = spyOn(core, 'info').mockImplementation(() => {});
const errorSpy = spyOn(core, 'error').mockImplementation(() => {});
const warningSpy = spyOn(core, 'warning').mockImplementation(() => {});
const debugSpy = spyOn(core, 'debug').mockImplementation(() => {});

const ASANA_API_BASE = 'https://app.asana.com/api/1.0';

// Setup MSW server
const server = setupServer();

describe('Asana Task Fetching', () => {
  const mockAsanaToken = 'test-token-123';

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  beforeEach(() => {
    infoSpy.mockClear();
    errorSpy.mockClear();
    warningSpy.mockClear();
    debugSpy.mockClear();
  });
  afterEach(() => {
    server.resetHandlers();
  });
  afterAll(() => server.close());

  describe('fetchTaskDetails', () => {
    test('fetches task details successfully', async () => {
      const taskGid = '1234567890';

      server.use(
        http.get(`${ASANA_API_BASE}/tasks/${taskGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: taskGid,
              name: 'Test Task',
              permalink_url: 'https://app.asana.com/0/0/1234567890/f',
            },
          });
        })
      );

      const result = await fetchTaskDetails(taskGid, mockAsanaToken);
      expect(result).toEqual({
        gid: taskGid,
        name: 'Test Task',
        url: 'https://app.asana.com/0/0/1234567890/f',
      });
    });

    test('falls back to constructed URL when permalink_url not available', async () => {
      const taskGid = '1234567890';

      server.use(
        http.get(`${ASANA_API_BASE}/tasks/${taskGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: taskGid,
              name: 'Test Task',
              // No permalink_url
            },
          });
        })
      );

      const result = await fetchTaskDetails(taskGid, mockAsanaToken);
      expect(result).toEqual({
        gid: taskGid,
        name: 'Test Task',
        url: 'https://app.asana.com/0/0/1234567890/f',
      });
    });

    test('retries on failure', async () => {
      const taskGid = '1234567890';
      let attemptCount = 0;

      server.use(
        http.get(`${ASANA_API_BASE}/tasks/${taskGid}`, () => {
          attemptCount++;
          if (attemptCount < 2) {
            return HttpResponse.json({ errors: [{ message: 'Server error' }] }, { status: 500 });
          }
          return HttpResponse.json({
            data: {
              gid: taskGid,
              name: 'Test Task',
              permalink_url: 'https://app.asana.com/0/0/1234567890/f',
            },
          });
        })
      );

      const result = await fetchTaskDetails(taskGid, mockAsanaToken);
      expect(result.gid).toBe(taskGid);
      expect(attemptCount).toBe(2);
    });
  });

  describe('fetchAllTaskDetails', () => {
    test('fetches details for multiple tasks successfully', async () => {
      const taskGids = ['task-1', 'task-2', 'task-3'];

      server.use(
        http.get(`${ASANA_API_BASE}/tasks/:gid`, ({ params }) => {
          const gid = params.gid as string;
          return HttpResponse.json({
            data: {
              gid,
              name: `Task ${gid}`,
              permalink_url: `https://app.asana.com/0/0/${gid}/f`,
            },
          });
        })
      );

      const results = await fetchAllTaskDetails(taskGids, mockAsanaToken);
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({
        gid: 'task-1',
        name: 'Task task-1',
        url: 'https://app.asana.com/0/0/task-1/f',
      });
      expect(results[1]).toEqual({
        gid: 'task-2',
        name: 'Task task-2',
        url: 'https://app.asana.com/0/0/task-2/f',
      });
      expect(results[2]).toEqual({
        gid: 'task-3',
        name: 'Task task-3',
        url: 'https://app.asana.com/0/0/task-3/f',
      });
    });

    test('uses placeholder for failed fetches', async () => {
      const taskGids = ['task-1', 'task-2', 'task-3'];

      server.use(
        http.get(`${ASANA_API_BASE}/tasks/:gid`, ({ params }) => {
          const gid = params.gid as string;
          if (gid === 'task-2') {
            return HttpResponse.json({ errors: [{ message: 'Not found' }] }, { status: 404 });
          }
          return HttpResponse.json({
            data: {
              gid,
              name: `Task ${gid}`,
              permalink_url: `https://app.asana.com/0/0/${gid}/f`,
            },
          });
        })
      );

      const results = await fetchAllTaskDetails(taskGids, mockAsanaToken);
      expect(results).toHaveLength(3);
      expect(results[0].name).toBe('Task task-1');
      // Task 2 should have placeholder
      expect(results[1]).toEqual({
        gid: 'task-2',
        name: 'Task task-2',
        url: 'https://app.asana.com/0/0/task-2/f',
      });
      expect(results[2].name).toBe('Task task-3');
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch details for task task-2')
      );
    });

    test('handles empty task list', async () => {
      const results = await fetchAllTaskDetails([], mockAsanaToken);
      expect(results).toHaveLength(0);
    });
  });

  describe('checkIfPRAlreadyLinked', () => {
    const taskGid = '1234567890';
    const prUrl = 'https://github.com/org/repo/pull/42';

    test('returns true when PR is linked via view_url', async () => {
      server.use(
        http.get(`${ASANA_API_BASE}/attachments`, () => {
          return HttpResponse.json({
            data: [
              {
                gid: 'attach-1',
                name: 'Some file',
                resource_subtype: 'external',
                view_url: 'https://example.com/other',
              },
              {
                gid: 'attach-2',
                name: 'PR Link',
                resource_subtype: 'external',
                view_url: prUrl,
              },
            ],
          });
        })
      );

      const result = await checkIfPRAlreadyLinked(taskGid, prUrl, mockAsanaToken);
      expect(result).toBe(true);
      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining('PR already linked to task')
      );
    });

    test('returns true when PR is linked via name', async () => {
      server.use(
        http.get(`${ASANA_API_BASE}/attachments`, () => {
          return HttpResponse.json({
            data: [
              {
                gid: 'attach-1',
                name: prUrl,
                resource_subtype: 'external',
              },
            ],
          });
        })
      );

      const result = await checkIfPRAlreadyLinked(taskGid, prUrl, mockAsanaToken);
      expect(result).toBe(true);
    });

    test('returns false when PR is not linked', async () => {
      server.use(
        http.get(`${ASANA_API_BASE}/attachments`, () => {
          return HttpResponse.json({
            data: [
              {
                gid: 'attach-1',
                name: 'Other attachment',
                resource_subtype: 'external',
                view_url: 'https://example.com/other',
              },
            ],
          });
        })
      );

      const result = await checkIfPRAlreadyLinked(taskGid, prUrl, mockAsanaToken);
      expect(result).toBe(false);
      expect(core.debug).toHaveBeenCalledWith(
        expect.stringContaining('PR not yet linked to task')
      );
    });

    test('returns false when no attachments', async () => {
      server.use(
        http.get(`${ASANA_API_BASE}/attachments`, () => {
          return HttpResponse.json({ data: [] });
        })
      );

      const result = await checkIfPRAlreadyLinked(taskGid, prUrl, mockAsanaToken);
      expect(result).toBe(false);
    });

    test('returns false (fail open) on API error', async () => {
      server.use(
        http.get(`${ASANA_API_BASE}/attachments`, () => {
          return HttpResponse.json({ errors: [{ message: 'Server error' }] }, { status: 500 });
        })
      );

      const result = await checkIfPRAlreadyLinked(taskGid, prUrl, mockAsanaToken);
      expect(result).toBe(false);
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to check existing links for task')
      );
    });

    test('checks both view_url and name fields', async () => {
      server.use(
        http.get(`${ASANA_API_BASE}/attachments`, () => {
          return HttpResponse.json({
            data: [
              {
                gid: 'attach-1',
                name: 'Attachment with URL in name: ' + prUrl,
                resource_subtype: 'external',
              },
            ],
          });
        })
      );

      const result = await checkIfPRAlreadyLinked(taskGid, prUrl, mockAsanaToken);
      expect(result).toBe(true);
    });

    test('handles attachments without view_url', async () => {
      server.use(
        http.get(`${ASANA_API_BASE}/attachments`, () => {
          return HttpResponse.json({
            data: [
              {
                gid: 'attach-1',
                name: 'File.pdf',
                resource_subtype: 'asana',
                // No view_url
              },
            ],
          });
        })
      );

      const result = await checkIfPRAlreadyLinked(taskGid, prUrl, mockAsanaToken);
      expect(result).toBe(false);
    });

    test('retries on transient errors', async () => {
      let attemptCount = 0;

      server.use(
        http.get(`${ASANA_API_BASE}/attachments`, () => {
          attemptCount++;
          if (attemptCount < 2) {
            return HttpResponse.json({ errors: [{ message: 'Server error' }] }, { status: 500 });
          }
          return HttpResponse.json({
            data: [
              {
                gid: 'attach-1',
                name: 'PR',
                resource_subtype: 'external',
                view_url: prUrl,
              },
            ],
          });
        })
      );

      const result = await checkIfPRAlreadyLinked(taskGid, prUrl, mockAsanaToken);
      expect(result).toBe(true);
      expect(attemptCount).toBe(2);
    });
  });
});
