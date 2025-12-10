/**
 * Tests for Asana API utility functions
 * Focuses on field type coercion and validation
 */

import { describe, test, expect, beforeAll, beforeEach, afterEach, afterAll, spyOn } from 'bun:test';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { updateTaskFields, clearFieldSchemaCache } from '../../src/util/asana';
import * as core from '@actions/core';

// Create spies for @actions/core
const infoSpy = spyOn(core, 'info').mockImplementation(() => {});
const errorSpy = spyOn(core, 'error').mockImplementation(() => {});
const warningSpy = spyOn(core, 'warning').mockImplementation(() => {});
const debugSpy = spyOn(core, 'debug').mockImplementation(() => {});

const ASANA_API_BASE = 'https://app.asana.com/api/1.0';

// Setup MSW server
const server = setupServer();

describe('Asana Field Type System', () => {
  const mockAsanaToken = 'test-token-123';
  const mockTaskGid = '1234567890';

  beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
  beforeEach(() => {
    infoSpy.mockClear();
    errorSpy.mockClear();
    warningSpy.mockClear();
    debugSpy.mockClear();
    clearFieldSchemaCache(); // Clear module-level cache between tests
  });
  afterEach(() => {
    server.resetHandlers();
  });
  afterAll(() => server.close());

  describe('Enum Fields', () => {
    test('successfully updates with valid enum option', async () => {
      const fieldGid = '1111111111';
      const fieldUpdates = new Map([[fieldGid, 'In Review']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Status',
              type: 'enum',
              enum_options: [
                { gid: 'enum-1', name: 'In Progress', enabled: true },
                { gid: 'enum-2', name: 'In Review', enabled: true },
                { gid: 'enum-3', name: 'Done', enabled: true },
              ],
            },
          });
        }),
        http.put(`${ASANA_API_BASE}/tasks/${mockTaskGid}`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.debug).toHaveBeenCalledWith(
        expect.stringContaining('✓ Field 1111111111 (enum): "In Review" → enum-2')
      );
    });

    test('logs error for invalid enum option', async () => {
      const fieldGid = '1111111111';
      const fieldUpdates = new Map([[fieldGid, 'Invalid State']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Status',
              type: 'enum',
              enum_options: [
                { gid: 'enum-1', name: 'In Progress', enabled: true },
                { gid: 'enum-2', name: 'In Review', enabled: true },
              ],
            },
          });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.error).toHaveBeenCalledWith(
        expect.stringContaining('enum option "Invalid State" not found')
      );
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('No valid fields to update')
      );
    });
  });

  describe('Text Fields', () => {
    test('updates text field with string value', async () => {
      const fieldGid = '2222222222';
      const fieldUpdates = new Map([[fieldGid, 'Build 456']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Build Number',
              type: 'text',
            },
          });
        }),
        http.put(`${ASANA_API_BASE}/tasks/${mockTaskGid}`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.debug).toHaveBeenCalledWith(
        expect.stringContaining('✓ Field 2222222222 (text): "Build 456" → Build 456')
      );
    });

    test('updates multi_line_text field with multiline string', async () => {
      const fieldGid = '2222222222';
      const fieldUpdates = new Map([[fieldGid, 'Line 1\nLine 2\nLine 3']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Description',
              type: 'multi_line_text',
            },
          });
        }),
        http.put(`${ASANA_API_BASE}/tasks/${mockTaskGid}`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.debug).toHaveBeenCalledWith(
        expect.stringContaining('✓ Field 2222222222 (multi_line_text):')
      );
    });

    test('handles empty string', async () => {
      const fieldGid = '2222222222';
      const fieldUpdates = new Map([[fieldGid, '']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Notes',
              type: 'text',
            },
          });
        }),
        http.put(`${ASANA_API_BASE}/tasks/${mockTaskGid}`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.debug).toHaveBeenCalledWith(
        expect.stringContaining('✓ Field 2222222222 (text): "" →')
      );
    });
  });

  describe('Number Fields', () => {
    test('converts valid positive number string', async () => {
      const fieldGid = '3333333333';
      const fieldUpdates = new Map([[fieldGid, '123']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Priority',
              type: 'number',
            },
          });
        }),
        http.put(`${ASANA_API_BASE}/tasks/${mockTaskGid}`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.debug).toHaveBeenCalledWith(
        expect.stringContaining('✓ Field 3333333333 (number): "123" → 123')
      );
    });

    test('converts valid negative number string', async () => {
      const fieldGid = '3333333333';
      const fieldUpdates = new Map([[fieldGid, '-42']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Temperature',
              type: 'number',
            },
          });
        }),
        http.put(`${ASANA_API_BASE}/tasks/${mockTaskGid}`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.debug).toHaveBeenCalledWith(
        expect.stringContaining('✓ Field 3333333333 (number): "-42" → -42')
      );
    });

    test('converts zero', async () => {
      const fieldGid = '3333333333';
      const fieldUpdates = new Map([[fieldGid, '0']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Count',
              type: 'number',
            },
          });
        }),
        http.put(`${ASANA_API_BASE}/tasks/${mockTaskGid}`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.debug).toHaveBeenCalledWith(
        expect.stringContaining('✓ Field 3333333333 (number): "0" → 0')
      );
    });

    test('converts decimal number', async () => {
      const fieldGid = '3333333333';
      const fieldUpdates = new Map([[fieldGid, '3.14']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Pi',
              type: 'number',
            },
          });
        }),
        http.put(`${ASANA_API_BASE}/tasks/${mockTaskGid}`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.debug).toHaveBeenCalledWith(
        expect.stringContaining('✓ Field 3333333333 (number): "3.14" → 3.14')
      );
    });

    test('rejects non-numeric string', async () => {
      const fieldGid = '3333333333';
      const fieldUpdates = new Map([[fieldGid, 'abc']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Priority',
              type: 'number',
            },
          });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.error).toHaveBeenCalledWith(
        expect.stringContaining('"abc" is not a valid number')
      );
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('No valid fields to update')
      );
    });

    test('rejects partially numeric string', async () => {
      const fieldGid = '3333333333';
      const fieldUpdates = new Map([[fieldGid, '123abc']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Priority',
              type: 'number',
            },
          });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.error).toHaveBeenCalledWith(
        expect.stringContaining('"123abc" is not a valid number')
      );
    });

    test('rejects explicit NaN string', async () => {
      const fieldGid = '3333333333';
      const fieldUpdates = new Map([[fieldGid, 'NaN']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Priority',
              type: 'number',
            },
          });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.error).toHaveBeenCalledWith(
        expect.stringContaining('"NaN" is not a valid number')
      );
    });
  });

  describe('Date Fields', () => {
    test('accepts valid ISO 8601 date', async () => {
      const fieldGid = '4444444444';
      const fieldUpdates = new Map([[fieldGid, '2024-01-15']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Due Date',
              type: 'date',
            },
          });
        }),
        http.put(`${ASANA_API_BASE}/tasks/${mockTaskGid}`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.debug).toHaveBeenCalledWith(
        expect.stringContaining('✓ Field 4444444444 (date): "2024-01-15" → 2024-01-15')
      );
    });

    test('accepts leap year date', async () => {
      const fieldGid = '4444444444';
      const fieldUpdates = new Map([[fieldGid, '2024-02-29']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Due Date',
              type: 'date',
            },
          });
        }),
        http.put(`${ASANA_API_BASE}/tasks/${mockTaskGid}`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.debug).toHaveBeenCalledWith(
        expect.stringContaining('✓ Field 4444444444 (date): "2024-02-29" → 2024-02-29')
      );
    });

    test('rejects US date format', async () => {
      const fieldGid = '4444444444';
      const fieldUpdates = new Map([[fieldGid, '01/15/2024']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Due Date',
              type: 'date',
            },
          });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.error).toHaveBeenCalledWith(
        expect.stringContaining('"01/15/2024" must be YYYY-MM-DD format')
      );
    });

    test('rejects date without leading zeros', async () => {
      const fieldGid = '4444444444';
      const fieldUpdates = new Map([[fieldGid, '2024-1-5']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Due Date',
              type: 'date',
            },
          });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.error).toHaveBeenCalledWith(
        expect.stringContaining('"2024-1-5" must be YYYY-MM-DD format')
      );
    });

    test('rejects non-date string', async () => {
      const fieldGid = '4444444444';
      const fieldUpdates = new Map([[fieldGid, 'not-a-date']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Due Date',
              type: 'date',
            },
          });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.error).toHaveBeenCalledWith(
        expect.stringContaining('"not-a-date" must be YYYY-MM-DD format')
      );
    });

    test('rejects invalid month', async () => {
      const fieldGid = '4444444444';
      const fieldUpdates = new Map([[fieldGid, '2024-13-01']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Due Date',
              type: 'date',
            },
          });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.error).toHaveBeenCalledWith(
        expect.stringContaining('"2024-13-01" is not a valid date')
      );
    });

    test('rejects invalid day for month', async () => {
      const fieldGid = '4444444444';
      const fieldUpdates = new Map([[fieldGid, '2024-02-30']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Due Date',
              type: 'date',
            },
          });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.error).toHaveBeenCalledWith(
        expect.stringContaining('"2024-02-30" is not a valid date')
      );
    });

    test('rejects leap day in non-leap year', async () => {
      const fieldGid = '4444444444';
      const fieldUpdates = new Map([[fieldGid, '2023-02-29']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Due Date',
              type: 'date',
            },
          });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.error).toHaveBeenCalledWith(
        expect.stringContaining('"2023-02-29" is not a valid date')
      );
    });
  });

  describe('Mixed Batch Updates', () => {
    test('updates multiple fields of different types in one call', async () => {
      const fieldUpdates = new Map([
        ['1111111111', 'In Review'], // enum
        ['2222222222', 'Build 789'], // text
        ['3333333333', '42'], // number
        ['4444444444', '2024-12-31'], // date
      ]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/1111111111`, () => {
          return HttpResponse.json({
            data: {
              gid: '1111111111',
              name: 'Status',
              type: 'enum',
              enum_options: [{ gid: 'enum-1', name: 'In Review', enabled: true }],
            },
          });
        }),
        http.get(`${ASANA_API_BASE}/custom_fields/2222222222`, () => {
          return HttpResponse.json({
            data: { gid: '2222222222', name: 'Build', type: 'text' },
          });
        }),
        http.get(`${ASANA_API_BASE}/custom_fields/3333333333`, () => {
          return HttpResponse.json({
            data: { gid: '3333333333', name: 'Priority', type: 'number' },
          });
        }),
        http.get(`${ASANA_API_BASE}/custom_fields/4444444444`, () => {
          return HttpResponse.json({
            data: { gid: '4444444444', name: 'Due Date', type: 'date' },
          });
        }),
        http.put(`${ASANA_API_BASE}/tasks/${mockTaskGid}`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      // Verify all fields were logged as updated
      expect(core.debug).toHaveBeenCalledWith(expect.stringContaining('✓ Field 1111111111 (enum)'));
      expect(core.debug).toHaveBeenCalledWith(expect.stringContaining('✓ Field 2222222222 (text)'));
      expect(core.debug).toHaveBeenCalledWith(
        expect.stringContaining('✓ Field 3333333333 (number)')
      );
      expect(core.debug).toHaveBeenCalledWith(expect.stringContaining('✓ Field 4444444444 (date)'));
    });

    test('continues with valid fields when some are invalid', async () => {
      const fieldUpdates = new Map([
        ['1111111111', 'Invalid State'], // enum - INVALID
        ['2222222222', 'Build 123'], // text - VALID
        ['3333333333', 'not-a-number'], // number - INVALID
        ['4444444444', '2024-01-15'], // date - VALID
      ]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/1111111111`, () => {
          return HttpResponse.json({
            data: {
              gid: '1111111111',
              type: 'enum',
              enum_options: [{ gid: 'enum-1', name: 'Valid State', enabled: true }],
            },
          });
        }),
        http.get(`${ASANA_API_BASE}/custom_fields/2222222222`, () => {
          return HttpResponse.json({
            data: { gid: '2222222222', type: 'text' },
          });
        }),
        http.get(`${ASANA_API_BASE}/custom_fields/3333333333`, () => {
          return HttpResponse.json({
            data: { gid: '3333333333', type: 'number' },
          });
        }),
        http.get(`${ASANA_API_BASE}/custom_fields/4444444444`, () => {
          return HttpResponse.json({
            data: { gid: '4444444444', type: 'date' },
          });
        }),
        http.put(`${ASANA_API_BASE}/tasks/${mockTaskGid}`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      // Invalid fields should log errors
      expect(core.error).toHaveBeenCalledWith(
        expect.stringContaining('enum option "Invalid State" not found')
      );
      expect(core.error).toHaveBeenCalledWith(
        expect.stringContaining('"not-a-number" is not a valid number')
      );

      // Valid fields should be updated
      expect(core.debug).toHaveBeenCalledWith(expect.stringContaining('✓ Field 2222222222 (text)'));
      expect(core.debug).toHaveBeenCalledWith(expect.stringContaining('✓ Field 4444444444 (date)'));
    });
  });

  describe('Unsupported Field Types', () => {
    test('logs warning and skips unsupported field type', async () => {
      const fieldGid = '5555555555';
      const fieldUpdates = new Map([[fieldGid, 'some value']]);

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/${fieldGid}`, () => {
          return HttpResponse.json({
            data: {
              gid: fieldGid,
              name: 'Custom Type',
              type: 'unsupported_type',
            },
          });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining("has unsupported type 'unsupported_type'")
      );
      expect(core.warning).toHaveBeenCalledWith(
        expect.stringContaining('No valid fields to update')
      );
    });
  });

  describe('Field Schema Caching', () => {
    test('caches field schemas within a single updateTaskFields call', async () => {
      const fieldUpdates = new Map([
        ['1111111111', 'In Review'], // enum
        ['2222222222', 'Build 789'], // text
      ]);

      let enumSchemaFetchCount = 0;
      let textSchemaFetchCount = 0;

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/1111111111`, () => {
          enumSchemaFetchCount++;
          return HttpResponse.json({
            data: {
              gid: '1111111111',
              name: 'Status',
              type: 'enum',
              enum_options: [{ gid: 'enum-1', name: 'In Review', enabled: true }],
            },
          });
        }),
        http.get(`${ASANA_API_BASE}/custom_fields/2222222222`, () => {
          textSchemaFetchCount++;
          return HttpResponse.json({
            data: { gid: '2222222222', name: 'Build', type: 'text' },
          });
        }),
        http.put(`${ASANA_API_BASE}/tasks/${mockTaskGid}`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      await updateTaskFields(mockTaskGid, fieldUpdates, mockAsanaToken);

      // Each field schema should be fetched exactly once
      expect(enumSchemaFetchCount).toBe(1);
      expect(textSchemaFetchCount).toBe(1);
    });

    test('caches field schemas across multiple task updates', async () => {
      const fieldUpdates = new Map([
        ['1111111111', 'In Review'],
        ['2222222222', 'Build 123'],
      ]);

      let schemaFetchCount = 0;

      server.use(
        http.get(`${ASANA_API_BASE}/custom_fields/1111111111`, () => {
          schemaFetchCount++;
          return HttpResponse.json({
            data: {
              gid: '1111111111',
              name: 'Status',
              type: 'enum',
              enum_options: [{ gid: 'enum-1', name: 'In Review', enabled: true }],
            },
          });
        }),
        http.get(`${ASANA_API_BASE}/custom_fields/2222222222`, () => {
          schemaFetchCount++;
          return HttpResponse.json({
            data: { gid: '2222222222', name: 'Build', type: 'text' },
          });
        }),
        http.put(`${ASANA_API_BASE}/tasks/:taskGid`, () => {
          return HttpResponse.json({ data: {} });
        })
      );

      // Update 3 different tasks with the same fields
      await updateTaskFields('task-1', fieldUpdates, mockAsanaToken);
      await updateTaskFields('task-2', fieldUpdates, mockAsanaToken);
      await updateTaskFields('task-3', fieldUpdates, mockAsanaToken);

      // Schemas should only be fetched once total (2 fields × 1 fetch each)
      // NOT 3 times (once per task)
      expect(schemaFetchCount).toBe(2);
    });
  });
});
