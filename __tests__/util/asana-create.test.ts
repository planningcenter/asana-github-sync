/**
 * Tests for Asana task creation utilities
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach, afterAll, spyOn } from 'bun:test';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  createTask,
  createAllTasks,
  attachPRViaIntegration,
  attachPRToExistingTasks,
  type PRMetadata,
  type CreatedTaskResult,
} from '../../src/util/asana/create';
import type { CreateTaskSpec } from '../../src/rules/engine';
import * as core from '@actions/core';

// Create spies for @actions/core
const infoSpy = spyOn(core, 'info').mockImplementation(() => {});
const errorSpy = spyOn(core, 'error').mockImplementation(() => {});
const warningSpy = spyOn(core, 'warning').mockImplementation(() => {});
const debugSpy = spyOn(core, 'debug').mockImplementation(() => {});

const ASANA_API_BASE = 'https://app.asana.com/api/1.0';
const INTEGRATION_URL = 'https://github.integrations.asana.plus/custom/v1/actions/widget';

// Setup MSW server
const server = setupServer();

describe('Asana Task Creation', () => {
  const mockAsanaToken = 'test-token-123';
  const mockIntegrationSecret = 'integration-secret';
  const mockPRMetadata: PRMetadata = {
    number: 42,
    title: 'Test PR',
    body: 'PR description',
    url: 'https://github.com/org/repo/pull/42',
  };

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

  describe('createTask', () => {
    test('creates basic task successfully', async () => {
      const spec: CreateTaskSpec = {
        action: {
          type: 'create_task',
          project: '1234567890',
          workspace: '9876543210',
        },
        evaluatedTitle: 'Test Task',
        evaluatedNotes: null,
        evaluatedHtmlNotes: null,
        evaluatedAssignee: null,
        evaluatedInitialFields: new Map(),
      };

      server.use(
        http.post(`${ASANA_API_BASE}/tasks`, () => {
          return HttpResponse.json({
            data: {
              gid: 'task-123',
              name: 'Test Task',
              permalink_url: 'https://app.asana.com/0/1234567890/task-123',
            },
          });
        }),
        http.post(`${ASANA_API_BASE}/tasks/task-123/removeFollowers`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      const result = await createTask(spec, mockAsanaToken, undefined, mockPRMetadata);

      expect(result).toEqual({
        gid: 'task-123',
        name: 'Test Task',
        url: 'https://app.asana.com/0/1234567890/task-123',
        success: true,
      });
      expect(core.info).toHaveBeenCalledWith('✓ Task created: task-123');
    });

    test('creates task with section', async () => {
      const spec: CreateTaskSpec = {
        action: {
          type: 'create_task',
          project: '1234567890',
          workspace: '9876543210',
          section: 'section-456',
        },
        evaluatedTitle: 'Test Task',
        evaluatedNotes: null,
        evaluatedHtmlNotes: null,
        evaluatedAssignee: null,
        evaluatedInitialFields: new Map(),
      };

      server.use(
        http.post(`${ASANA_API_BASE}/tasks`, async ({ request }) => {
          const body = await request.json();
          const taskData = (body as any).data;
          expect(taskData.memberships).toEqual([
            { project: '1234567890', section: 'section-456' },
          ]);
          return HttpResponse.json({
            data: {
              gid: 'task-123',
              name: 'Test Task',
              permalink_url: 'https://app.asana.com/0/1234567890/task-123',
            },
          });
        }),
        http.post(`${ASANA_API_BASE}/tasks/task-123/removeFollowers`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      const result = await createTask(spec, mockAsanaToken, undefined, mockPRMetadata);
      expect(result.success).toBe(true);
    });

    test('creates task with notes', async () => {
      const spec: CreateTaskSpec = {
        action: {
          type: 'create_task',
          project: '1234567890',
          workspace: '9876543210',
        },
        evaluatedTitle: 'Test Task',
        evaluatedNotes: 'Plain text notes',
        evaluatedHtmlNotes: null,
        evaluatedAssignee: null,
        evaluatedInitialFields: new Map(),
      };

      server.use(
        http.post(`${ASANA_API_BASE}/tasks`, async ({ request }) => {
          const body = await request.json();
          const taskData = (body as any).data;
          expect(taskData.notes).toBe('Plain text notes');
          return HttpResponse.json({
            data: {
              gid: 'task-123',
              name: 'Test Task',
              permalink_url: 'https://app.asana.com/0/1234567890/task-123',
            },
          });
        }),
        http.post(`${ASANA_API_BASE}/tasks/task-123/removeFollowers`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      await createTask(spec, mockAsanaToken, undefined, mockPRMetadata);
    });

    test('creates task with html_notes', async () => {
      const spec: CreateTaskSpec = {
        action: {
          type: 'create_task',
          project: '1234567890',
          workspace: '9876543210',
        },
        evaluatedTitle: 'Test Task',
        evaluatedNotes: null,
        evaluatedHtmlNotes: '<b>HTML notes</b>',
        evaluatedAssignee: null,
        evaluatedInitialFields: new Map(),
      };

      server.use(
        http.post(`${ASANA_API_BASE}/tasks`, async ({ request }) => {
          const body = await request.json();
          const taskData = (body as any).data;
          expect(taskData.html_notes).toBe('<b>HTML notes</b>');
          return HttpResponse.json({
            data: {
              gid: 'task-123',
              name: 'Test Task',
              permalink_url: 'https://app.asana.com/0/1234567890/task-123',
            },
          });
        }),
        http.post(`${ASANA_API_BASE}/tasks/task-123/removeFollowers`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      await createTask(spec, mockAsanaToken, undefined, mockPRMetadata);
    });

    test('creates task with assignee', async () => {
      const spec: CreateTaskSpec = {
        action: {
          type: 'create_task',
          project: '1234567890',
          workspace: '9876543210',
        },
        evaluatedTitle: 'Test Task',
        evaluatedNotes: null,
        evaluatedHtmlNotes: null,
        evaluatedAssignee: 'user-123',
        evaluatedInitialFields: new Map(),
      };

      server.use(
        http.post(`${ASANA_API_BASE}/tasks`, async ({ request }) => {
          const body = await request.json();
          const taskData = (body as any).data;
          expect(taskData.assignee).toBe('user-123');
          return HttpResponse.json({
            data: {
              gid: 'task-123',
              name: 'Test Task',
              permalink_url: 'https://app.asana.com/0/1234567890/task-123',
            },
          });
        }),
        http.post(`${ASANA_API_BASE}/tasks/task-123/removeFollowers`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      await createTask(spec, mockAsanaToken, undefined, mockPRMetadata);
    });

    test('creates task with custom fields', async () => {
      const spec: CreateTaskSpec = {
        action: {
          type: 'create_task',
          project: '1234567890',
          workspace: '9876543210',
        },
        evaluatedTitle: 'Test Task',
        evaluatedNotes: null,
        evaluatedHtmlNotes: null,
        evaluatedAssignee: null,
        evaluatedInitialFields: new Map([
          ['field-1', 'Done'],
          ['field-2', '42'],
        ]),
      };

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
        http.get(`${ASANA_API_BASE}/custom_fields/field-2`, () => {
          return HttpResponse.json({
            data: {
              gid: 'field-2',
              name: 'Priority',
              type: 'number',
            },
          });
        }),
        http.post(`${ASANA_API_BASE}/tasks`, async ({ request }) => {
          const body = await request.json();
          const taskData = (body as any).data;
          expect(taskData.custom_fields).toEqual({
            'field-1': 'opt-1',
            'field-2': 42,
          });
          return HttpResponse.json({
            data: {
              gid: 'task-123',
              name: 'Test Task',
              permalink_url: 'https://app.asana.com/0/1234567890/task-123',
            },
          });
        }),
        http.post(`${ASANA_API_BASE}/tasks/task-123/removeFollowers`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      await createTask(spec, mockAsanaToken, undefined, mockPRMetadata);
    });

    test('handles invalid custom field gracefully', async () => {
      const spec: CreateTaskSpec = {
        action: {
          type: 'create_task',
          project: '1234567890',
          workspace: '9876543210',
        },
        evaluatedTitle: 'Test Task',
        evaluatedNotes: null,
        evaluatedHtmlNotes: null,
        evaluatedAssignee: null,
        evaluatedInitialFields: new Map([['field-1', 'InvalidValue']]),
      };

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
        http.post(`${ASANA_API_BASE}/tasks`, () => {
          return HttpResponse.json({
            data: {
              gid: 'task-123',
              name: 'Test Task',
              permalink_url: 'https://app.asana.com/0/1234567890/task-123',
            },
          });
        }),
        http.post(`${ASANA_API_BASE}/tasks/task-123/removeFollowers`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      const result = await createTask(spec, mockAsanaToken, undefined, mockPRMetadata);
      expect(result.success).toBe(true);
      // Invalid enum values log an error but task creation continues
      expect(core.error).toHaveBeenCalledWith(
        expect.stringContaining('enum option "InvalidValue" not found')
      );
    });

    test('falls back to constructed URL when permalink_url not provided', async () => {
      const spec: CreateTaskSpec = {
        action: {
          type: 'create_task',
          project: '1234567890',
          workspace: '9876543210',
        },
        evaluatedTitle: 'Test Task',
        evaluatedNotes: null,
        evaluatedHtmlNotes: null,
        evaluatedAssignee: null,
        evaluatedInitialFields: new Map(),
      };

      server.use(
        http.post(`${ASANA_API_BASE}/tasks`, () => {
          return HttpResponse.json({
            data: {
              gid: 'task-123',
              name: 'Test Task',
              // No permalink_url
            },
          });
        }),
        http.post(`${ASANA_API_BASE}/tasks/task-123/removeFollowers`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      const result = await createTask(spec, mockAsanaToken, undefined, mockPRMetadata);
      expect(result.url).toBe('https://app.asana.com/0/1234567890/task-123');
    });

    test('handles follower removal failure gracefully', async () => {
      const spec: CreateTaskSpec = {
        action: {
          type: 'create_task',
          project: '1234567890',
          workspace: '9876543210',
        },
        evaluatedTitle: 'Test Task',
        evaluatedNotes: null,
        evaluatedHtmlNotes: null,
        evaluatedAssignee: null,
        evaluatedInitialFields: new Map(),
      };

      server.use(
        http.post(`${ASANA_API_BASE}/tasks`, () => {
          return HttpResponse.json({
            data: {
              gid: 'task-123',
              name: 'Test Task',
              permalink_url: 'https://app.asana.com/0/1234567890/task-123',
            },
          });
        }),
        http.post(`${ASANA_API_BASE}/tasks/task-123/removeFollowers`, () => {
          return HttpResponse.json({ errors: [{ message: 'Failed' }] }, { status: 500 });
        })
      );

      const result = await createTask(spec, mockAsanaToken, undefined, mockPRMetadata);
      expect(result.success).toBe(true);
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('Failed to remove integration user as follower')
      );
    });

    test('attaches PR via integration when secret provided', async () => {
      const spec: CreateTaskSpec = {
        action: {
          type: 'create_task',
          project: '1234567890',
          workspace: '9876543210',
        },
        evaluatedTitle: 'Test Task',
        evaluatedNotes: null,
        evaluatedHtmlNotes: null,
        evaluatedAssignee: null,
        evaluatedInitialFields: new Map(),
      };

      server.use(
        http.post(`${ASANA_API_BASE}/tasks`, () => {
          return HttpResponse.json({
            data: {
              gid: 'task-123',
              name: 'Test Task',
              permalink_url: 'https://app.asana.com/0/1234567890/task-123',
            },
          });
        }),
        http.post(`${ASANA_API_BASE}/tasks/task-123/removeFollowers`, () => {
          return HttpResponse.json({ data: {} });
        }),
        http.post(INTEGRATION_URL, () => {
          return HttpResponse.json({ success: true });
        })
      );

      const result = await createTask(spec, mockAsanaToken, mockIntegrationSecret, mockPRMetadata);
      expect(result.success).toBe(true);
      expect(core.info).toHaveBeenCalledWith('✓ PR attached via integration');
    });

    test('handles integration attachment failure gracefully', async () => {
      const spec: CreateTaskSpec = {
        action: {
          type: 'create_task',
          project: '1234567890',
          workspace: '9876543210',
        },
        evaluatedTitle: 'Test Task',
        evaluatedNotes: null,
        evaluatedHtmlNotes: null,
        evaluatedAssignee: null,
        evaluatedInitialFields: new Map(),
      };

      server.use(
        http.post(`${ASANA_API_BASE}/tasks`, () => {
          return HttpResponse.json({
            data: {
              gid: 'task-123',
              name: 'Test Task',
              permalink_url: 'https://app.asana.com/0/1234567890/task-123',
            },
          });
        }),
        http.post(`${ASANA_API_BASE}/tasks/task-123/removeFollowers`, () => {
          return HttpResponse.json({ data: {} });
        }),
        http.post(INTEGRATION_URL, () => {
          return HttpResponse.json({ error: 'Failed' }, { status: 500 });
        })
      );

      const result = await createTask(spec, mockAsanaToken, mockIntegrationSecret, mockPRMetadata);
      expect(result.success).toBe(true);
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('Integration attachment failed with status 500')
      );
    });
  });

  describe('attachPRViaIntegration', () => {
    test('successfully attaches PR to task', async () => {
      const taskUrl = 'https://app.asana.com/0/1234567890/task-123';

      server.use(
        http.post(INTEGRATION_URL, async ({ request }) => {
          const body = await request.json();
          const payload = body as any;
          expect(payload.pullRequestName).toBe('Test PR');
          expect(payload.pullRequestNumber).toBe(42);
          expect(payload.pullRequestURL).toBe('https://github.com/org/repo/pull/42');
          expect(payload.pullRequestDescription).toContain('PR description');
          expect(payload.pullRequestDescription).toContain(taskUrl);
          return HttpResponse.json({ success: true });
        })
      );

      await attachPRViaIntegration(taskUrl, mockPRMetadata, mockIntegrationSecret);
      expect(core.info).toHaveBeenCalledWith('✓ PR attached via integration');
    });

    test('handles 500 error from integration', async () => {
      const taskUrl = 'https://app.asana.com/0/1234567890/task-123';

      server.use(
        http.post(INTEGRATION_URL, () => {
          return HttpResponse.text('Internal Server Error', { status: 500 });
        })
      );

      await attachPRViaIntegration(taskUrl, mockPRMetadata, mockIntegrationSecret);
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('Integration attachment failed with status 500')
      );
    });

    test('handles network error', async () => {
      const taskUrl = 'https://app.asana.com/0/1234567890/task-123';

      server.use(
        http.post(INTEGRATION_URL, () => {
          return HttpResponse.error();
        })
      );

      await attachPRViaIntegration(taskUrl, mockPRMetadata, mockIntegrationSecret);
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('Integration attachment failed')
      );
    });
  });

  describe('createAllTasks', () => {
    test('creates multiple tasks successfully', async () => {
      const specs: CreateTaskSpec[] = [
        {
          action: { type: 'create_task', project: '1234567890', workspace: '9876543210' },
          evaluatedTitle: 'Task 1',
          evaluatedNotes: null,
          evaluatedHtmlNotes: null,
          evaluatedAssignee: null,
          evaluatedInitialFields: new Map(),
        },
        {
          action: { type: 'create_task', project: '1234567890', workspace: '9876543210' },
          evaluatedTitle: 'Task 2',
          evaluatedNotes: null,
          evaluatedHtmlNotes: null,
          evaluatedAssignee: null,
          evaluatedInitialFields: new Map(),
        },
      ];

      server.use(
        http.post(`${ASANA_API_BASE}/tasks`, async ({ request }) => {
          const body = await request.json();
          const taskData = (body as any).data;
          return HttpResponse.json({
            data: {
              gid: `task-${taskData.name === 'Task 1' ? '1' : '2'}`,
              name: taskData.name,
              permalink_url: `https://app.asana.com/0/1234567890/task-${taskData.name === 'Task 1' ? '1' : '2'}`,
            },
          });
        }),
        http.post(`${ASANA_API_BASE}/tasks/:gid/removeFollowers`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      const results = await createAllTasks(specs, mockAsanaToken, undefined, mockPRMetadata);
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[0].name).toBe('Task 1');
      expect(results[1].success).toBe(true);
      expect(results[1].name).toBe('Task 2');
    });

    test('handles partial failures gracefully', async () => {
      const specs: CreateTaskSpec[] = [
        {
          action: { type: 'create_task', project: '1234567890', workspace: '9876543210' },
          evaluatedTitle: 'Task 1',
          evaluatedNotes: null,
          evaluatedHtmlNotes: null,
          evaluatedAssignee: null,
          evaluatedInitialFields: new Map(),
        },
        {
          action: { type: 'create_task', project: '1234567890', workspace: '9876543210' },
          evaluatedTitle: 'Task 2',
          evaluatedNotes: null,
          evaluatedHtmlNotes: null,
          evaluatedAssignee: null,
          evaluatedInitialFields: new Map(),
        },
      ];

      server.use(
        http.post(`${ASANA_API_BASE}/tasks`, async ({ request }) => {
          const body = await request.json();
          const taskData = (body as any).data;
          // Fail Task 1 with non-retryable error
          if (taskData.name === 'Task 1') {
            return HttpResponse.json({ errors: [{ message: 'Bad request' }] }, { status: 400 });
          }
          // Succeed for Task 2
          return HttpResponse.json({
            data: {
              gid: 'task-2',
              name: 'Task 2',
              permalink_url: 'https://app.asana.com/0/1234567890/task-2',
            },
          });
        }),
        http.post(`${ASANA_API_BASE}/tasks/:gid/removeFollowers`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      const results = await createAllTasks(specs, mockAsanaToken, undefined, mockPRMetadata);
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[0].gid).toBe('');
      expect(results[1].success).toBe(true);
      expect(results[1].gid).toBe('task-2');
      expect(core.error).toHaveBeenCalledWith(expect.stringContaining('Failed to create task "Task 1"'));
    });
  });

  describe('attachPRToExistingTasks', () => {
    test('attaches PR to tasks without existing link', async () => {
      const taskResults: CreatedTaskResult[] = [
        {
          gid: 'task-1',
          name: 'Task 1',
          url: 'https://app.asana.com/0/1234567890/task-1',
          success: true,
        },
      ];

      server.use(
        http.get(`${ASANA_API_BASE}/attachments`, () => {
          return HttpResponse.json({ data: [] });
        }),
        http.post(INTEGRATION_URL, () => {
          return HttpResponse.json({ success: true });
        })
      );

      await attachPRToExistingTasks(
        taskResults,
        mockPRMetadata,
        mockAsanaToken,
        mockIntegrationSecret
      );
      expect(core.info).toHaveBeenCalledWith('✓ Attached PR to task task-1');
    });

    test('skips tasks with existing PR link', async () => {
      const taskResults: CreatedTaskResult[] = [
        {
          gid: 'task-1',
          name: 'Task 1',
          url: 'https://app.asana.com/0/1234567890/task-1',
          success: true,
        },
      ];

      server.use(
        http.get(`${ASANA_API_BASE}/attachments`, () => {
          return HttpResponse.json({
            data: [
              {
                gid: 'attach-1',
                name: 'PR',
                resource_subtype: 'external',
                view_url: 'https://github.com/org/repo/pull/42',
              },
            ],
          });
        })
      );

      await attachPRToExistingTasks(
        taskResults,
        mockPRMetadata,
        mockAsanaToken,
        mockIntegrationSecret
      );
      // Should not call integration endpoint
      expect(core.info).toHaveBeenCalledWith(expect.stringContaining('already linked'));
    });

    test('skips failed tasks', async () => {
      const taskResults: CreatedTaskResult[] = [
        {
          gid: '',
          name: 'Failed Task',
          url: '',
          success: false,
        },
      ];

      await attachPRToExistingTasks(
        taskResults,
        mockPRMetadata,
        mockAsanaToken,
        mockIntegrationSecret
      );
      // Should not attempt to attach to failed task
      expect(core.info).not.toHaveBeenCalledWith(expect.stringContaining('Attached PR'));
    });

    test('handles attachment failure gracefully', async () => {
      const taskResults: CreatedTaskResult[] = [
        {
          gid: 'task-1',
          name: 'Task 1',
          url: 'https://app.asana.com/0/1234567890/task-1',
          success: true,
        },
      ];

      server.use(
        http.get(`${ASANA_API_BASE}/attachments`, () => {
          return HttpResponse.json({ data: [] });
        }),
        http.post(INTEGRATION_URL, () => {
          return HttpResponse.json({ error: 'Failed' }, { status: 500 });
        })
      );

      await attachPRToExistingTasks(
        taskResults,
        mockPRMetadata,
        mockAsanaToken,
        mockIntegrationSecret
      );
      // The warning comes from attachPRViaIntegration, not the wrapper function
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('Integration attachment failed with status 500')
      );
    });
  });
});
