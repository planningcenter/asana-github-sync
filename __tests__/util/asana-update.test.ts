/**
 * Tests for Asana task update utilities
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach, afterAll, spyOn } from 'bun:test';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { updateAllTasks, updateTaskFields } from '../../src/util/asana/update';
import { clearFieldSchemaCache } from '../../src/util/asana';
import * as core from '@actions/core';

// Create spies for @actions/core
const infoSpy = spyOn(core, 'info').mockImplementation(() => {});
const errorSpy = spyOn(core, 'error').mockImplementation(() => {});
const warningSpy = spyOn(core, 'warning').mockImplementation(() => {});
const debugSpy = spyOn(core, 'debug').mockImplementation(() => {});

const ASANA_API_BASE = 'https://app.asana.com/api/1.0';

// Setup MSW server
const server = setupServer();

describe('Asana Task Updates', () => {
  const mockAsanaToken = 'test-token-123';

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  beforeEach(() => {
    infoSpy.mockClear();
    errorSpy.mockClear();
    warningSpy.mockClear();
    debugSpy.mockClear();
    clearFieldSchemaCache();
  });
  afterEach(() => {
    server.resetHandlers();
  });
  afterAll(() => server.close());

  describe('updateAllTasks', () => {
    test('updates multiple tasks successfully', async () => {
      const taskIds = ['task-1', 'task-2'];
      const taskDetails = [
        { gid: 'task-1', name: 'Task 1', url: 'https://app.asana.com/0/0/task-1/f' },
        { gid: 'task-2', name: 'Task 2', url: 'https://app.asana.com/0/0/task-2/f' },
      ];
      const fieldUpdates = new Map([['field-1', 'Done']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/field-1`, () => {
          return HttpResponse.json({
            data: {
              gid: 'field-1',
              name: 'Status',
              type: 'enum',
              enum_options: [{ gid: 'opt-1', name: 'Done', enabled: true }],
            },
          });
        }),
        http.put(`${ASANA_API_BASE}/tasks/:gid`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      const results = await updateAllTasks(taskIds, taskDetails, fieldUpdates, mockAsanaToken);
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].gid).toBe('task-1');
      expect(results[1].success).toBe(true);
      expect(results[1].gid).toBe('task-2');
    });

    test('handles empty field updates', async () => {
      const taskIds = ['task-1'];
      const taskDetails = [
        { gid: 'task-1', name: 'Task 1', url: 'https://app.asana.com/0/0/task-1/f' },
      ];
      const fieldUpdates = new Map();

      const results = await updateAllTasks(taskIds, taskDetails, fieldUpdates, mockAsanaToken);
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    test('uses placeholder details when taskDetails not provided', async () => {
      const taskIds = ['task-1', 'task-2'];
      const taskDetails = [
        { gid: 'task-1', name: 'Task 1', url: 'https://app.asana.com/0/0/task-1/f' },
      ];
      const fieldUpdates = new Map([['field-1', 'Done']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/field-1`, () => {
          return HttpResponse.json({
            data: {
              gid: 'field-1',
              name: 'Status',
              type: 'enum',
              enum_options: [{ gid: 'opt-1', name: 'Done', enabled: true }],
            },
          });
        }),
        http.put(`${ASANA_API_BASE}/tasks/:gid`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      const results = await updateAllTasks(taskIds, taskDetails, fieldUpdates, mockAsanaToken);
      expect(results).toHaveLength(2);
      expect(results[1].gid).toBe('task-2');
      expect(results[1].name).toBe('Task task-2');
      expect(results[1].url).toBe('https://app.asana.com/0/0/task-2/f');
    });

    test('handles partial failures gracefully', async () => {
      const taskIds = ['task-1', 'task-2'];
      const taskDetails = [
        { gid: 'task-1', name: 'Task 1', url: 'https://app.asana.com/0/0/task-1/f' },
        { gid: 'task-2', name: 'Task 2', url: 'https://app.asana.com/0/0/task-2/f' },
      ];
      const fieldUpdates = new Map([['field-1', 'Done']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/field-1`, () => {
          return HttpResponse.json({
            data: {
              gid: 'field-1',
              name: 'Status',
              type: 'enum',
              enum_options: [{ gid: 'opt-1', name: 'Done', enabled: true }],
            },
          });
        }),
        http.put(`${ASANA_API_BASE}/tasks/:gid`, ({ params }) => {
          if (params.gid === 'task-1') {
            return HttpResponse.json({ errors: [{ message: 'Not found' }] }, { status: 404 });
          }
          return HttpResponse.json({ data: {} });
        })
      );

      const results = await updateAllTasks(taskIds, taskDetails, fieldUpdates, mockAsanaToken);
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[0].gid).toBe('task-1');
      expect(results[1].success).toBe(true);
      expect(results[1].gid).toBe('task-2');
      expect(core.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update task task-1')
      );
    });

    test('skips undefined task IDs', async () => {
      const taskIds = ['task-1', undefined as any, 'task-2'];
      const taskDetails = [
        { gid: 'task-1', name: 'Task 1', url: 'https://app.asana.com/0/0/task-1/f' },
        { gid: '', name: 'Task 2', url: '' },
        { gid: 'task-2', name: 'Task 2', url: 'https://app.asana.com/0/0/task-2/f' },
      ];
      const fieldUpdates = new Map([['field-1', 'Done']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/field-1`, () => {
          return HttpResponse.json({
            data: {
              gid: 'field-1',
              name: 'Status',
              type: 'enum',
              enum_options: [{ gid: 'opt-1', name: 'Done', enabled: true }],
            },
          });
        }),
        http.put(`${ASANA_API_BASE}/tasks/:gid`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      const results = await updateAllTasks(taskIds, taskDetails, fieldUpdates, mockAsanaToken);
      expect(results).toHaveLength(2); // Should skip undefined
    });

    test('handles empty task list', async () => {
      const taskIds: string[] = [];
      const taskDetails: any[] = [];
      const fieldUpdates = new Map([['field-1', 'Done']]);

      const results = await updateAllTasks(taskIds, taskDetails, fieldUpdates, mockAsanaToken);
      expect(results).toHaveLength(0);
    });
  });

  describe('updateTaskFields', () => {
    test('marks task as complete when __mark_complete field present', async () => {
      const taskGid = 'task-123';
      const fieldUpdates = new Map([
        ['field-1', 'Done'],
        ['__mark_complete', 'true'],
      ]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/field-1`, () => {
          return HttpResponse.json({
            data: {
              gid: 'field-1',
              name: 'Status',
              type: 'enum',
              enum_options: [{ gid: 'opt-1', name: 'Done', enabled: true }],
            },
          });
        }),
        http.put(`${ASANA_API_BASE}/tasks/${taskGid}`, async ({ request }) => {
          const body = await request.json();
          const updateData = (body as any).data;
          expect(updateData.completed).toBe(true);
          expect(updateData.custom_fields).toEqual({ 'field-1': 'opt-1' });
          return HttpResponse.json({ data: {} });
        })
      );

      await updateTaskFields(taskGid, fieldUpdates, mockAsanaToken);
      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining('successfully updated')
      );
    });

    test('handles field fetch error gracefully', async () => {
      const taskGid = 'task-123';
      const fieldUpdates = new Map([['field-1', 'Done']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/field-1`, () => {
          return HttpResponse.json({ errors: [{ message: 'Not found' }] }, { status: 404 });
        })
      );

      await updateTaskFields(taskGid, fieldUpdates, mockAsanaToken);
      expect(core.error).toHaveBeenCalledWith(
        expect.stringContaining('Skipping field field-1')
      );
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('No valid fields to update')
      );
    });

    test('updates task when only __mark_complete is set', async () => {
      const taskGid = 'task-123';
      const fieldUpdates = new Map([['__mark_complete', 'true']]);

      server.use(
        http.put(`${ASANA_API_BASE}/tasks/${taskGid}`, async ({ request }) => {
          const body = await request.json();
          const updateData = (body as any).data;
          expect(updateData.completed).toBe(true);
          return HttpResponse.json({ data: {} });
        })
      );

      await updateTaskFields(taskGid, fieldUpdates, mockAsanaToken);
      expect(core.info).toHaveBeenCalledWith(
        expect.stringContaining('successfully updated')
      );
    });
  });
});
