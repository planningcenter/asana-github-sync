/**
 * Asana API integration using direct HTTP requests
 */

import * as core from '@actions/core';
import { AsanaCustomField, AsanaEnumOption, AsanaTask } from '../types';
import { withRetry } from './retry';
import { ApiError } from './errors';

const ASANA_API_BASE = 'https://app.asana.com/api/1.0';

/**
 * Module-level cache for custom field schemas
 * Persists for the lifetime of the action run to avoid redundant API calls
 * when updating multiple tasks with the same fields
 */
const fieldSchemaCache = new Map<string, AsanaCustomField>();

/**
 * Clear the field schema cache (primarily for testing)
 */
export function clearFieldSchemaCache(): void {
  fieldSchemaCache.clear();
}

/**
 * Make an authenticated request to the Asana API
 *
 * @param token - Asana Personal Access Token
 * @param endpoint - API endpoint path (e.g., '/custom_fields/123')
 * @param options - Fetch options (method, body, etc.)
 * @returns Parsed JSON response
 */
async function asanaRequest<T = unknown>(token: string, endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${ASANA_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new ApiError(
      `Asana API error: ${response.status} ${response.statusText}`,
      response.status,
      errorBody
    );
  }

  const json = (await response.json()) as { data: T };
  return json.data;
}

/**
 * Fetch custom field definition from Asana
 *
 * @param token - Asana Personal Access Token
 * @param customFieldGid - Custom field GID
 * @returns Custom field definition
 */
async function fetchCustomField(token: string, customFieldGid: string) {
  core.info(`Fetching custom field ${customFieldGid}...`);
  return await withRetry(
    () => asanaRequest<AsanaCustomField>(token, `/custom_fields/${customFieldGid}`),
    `fetch custom field ${customFieldGid}`
  );
}

/**
 * Fetch task details (name and URL)
 *
 * @param taskGid - Task GID to fetch
 * @param asanaToken - Asana API token
 * @returns Task details with gid, name, and url
 */
export async function fetchTaskDetails(
  taskGid: string,
  asanaToken: string
): Promise<{ gid: string; name: string; url: string }> {
  core.debug(`Fetching details for task ${taskGid}...`);

  const task = await withRetry(
    () =>
      asanaRequest<AsanaTask>(asanaToken, `/tasks/${taskGid}?opt_fields=gid,name,permalink_url`),
    `fetch task ${taskGid}`
  );

  return {
    gid: task.gid,
    name: task.name,
    // Fallback to constructed URL if permalink_url not available
    url: task.permalink_url || `https://app.asana.com/0/0/${task.gid}/f`,
  };
}

/**
 * Fetch details for multiple tasks
 * Handles failures gracefully by using placeholder details
 *
 * @param taskGids - Array of task GIDs to fetch
 * @param asanaToken - Asana API token
 * @returns Array of task details (with placeholders for failed fetches)
 */
export async function fetchAllTaskDetails(
  taskGids: string[],
  asanaToken: string
): Promise<Array<{ gid: string; name: string; url: string }>> {
  core.info('Fetching task details...');

  const results: Array<{ gid: string; name: string; url: string }> = [];

  for (const taskGid of taskGids) {
    try {
      const details = await fetchTaskDetails(taskGid, asanaToken);
      results.push(details);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      core.warning(`Failed to fetch details for task ${taskGid}: ${errorMessage}`);
      // Add placeholder so we can still proceed
      results.push({
        gid: taskGid,
        name: `Task ${taskGid}`,
        url: `https://app.asana.com/0/0/${taskGid}/f`,
      });
    }
  }

  return results;
}

/**
 * Task update result (includes success status)
 */
export interface TaskUpdateResult {
  gid: string;
  name: string;
  url: string;
  success: boolean;
}

/**
 * Update multiple tasks with the same field updates
 * Handles failures gracefully and tracks success/failure per task
 *
 * @param taskIds - Array of task GIDs to update
 * @param taskDetails - Array of task details (parallel to taskIds)
 * @param fieldUpdates - Map of field updates to apply
 * @param asanaToken - Asana API token
 * @returns Array of task results with success status
 */
export async function updateAllTasks(
  taskIds: string[],
  taskDetails: Array<{ gid: string; name: string; url: string }>,
  fieldUpdates: Map<string, string>,
  asanaToken: string
): Promise<TaskUpdateResult[]> {
  const results: TaskUpdateResult[] = [];

  for (let i = 0; i < taskIds.length; i++) {
    const taskId = taskIds[i];
    const details = taskDetails[i] || {
      gid: taskId,
      name: `Task ${taskId}`,
      url: `https://app.asana.com/0/0/${taskId}/f`,
    };

    try {
      if (fieldUpdates.size > 0) {
        await updateTaskFields(taskId, fieldUpdates, asanaToken);
      }
      results.push({ ...details, success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      core.error(`Failed to update task ${taskId}: ${errorMessage}`);
      // TODO(feature): Consider posting error details as PR comment for better visibility
      // Similar to the reusable workflow pattern that posts Asana API errors to PR
      results.push({ ...details, success: false });
    }
  }

  return results;
}

/**
 * Find enum option matching the target state name
 *
 * @param customField - Custom field definition
 * @param stateName - Target state name to find
 * @param customFieldGid - Custom field GID for error messages
 * @returns Enum option GID, or null if not found
 */
function findEnumOption(customField: AsanaCustomField, stateName: string, customFieldGid: string): string | null {
  const enumOptions = customField.enum_options || [];

  if (enumOptions.length === 0) {
    core.error(
      `Custom field ${customFieldGid} has no enum options. It may not be an enum field (type: ${customField.type}).`
    );
    return null;
  }

  const matchingOption: AsanaEnumOption | undefined = enumOptions.find((opt) => opt.name === stateName);

  if (!matchingOption) {
    core.error(
      `State "${stateName}" not found in custom field ${customFieldGid}. ` +
        `Available options: ${enumOptions.map((o) => o.name).join(', ')}`
    );
    return null;
  }

  return matchingOption.gid;
}

/**
 * Coerce a raw string value to the appropriate type for an Asana custom field
 * Returns null if the value is invalid for the field type
 *
 * @param schema - The custom field schema from Asana
 * @param rawValue - The raw string value from template evaluation
 * @param fieldGid - The field GID (for error messages)
 * @returns The coerced value, or null if validation fails
 */
function coerceFieldValue(
  schema: AsanaCustomField,
  rawValue: string,
  fieldGid: string
) {
  switch (schema.type) {
    case 'enum':
      // Find matching enum option
      const enumGid = findEnumOption(schema, rawValue, fieldGid);
      if (!enumGid) {
        core.error(`Cannot update field ${fieldGid}: enum option "${rawValue}" not found`);
        return null;
      }
      return enumGid;

    case 'text':
    case 'multi_line_text':
      // Text fields: use string as-is
      return rawValue;

    case 'number':
      // Number fields: parse and validate
      const numberValue = Number(rawValue);
      if (isNaN(numberValue)) {
        core.error(`Cannot update field ${fieldGid}: "${rawValue}" is not a valid number`);
        return null;
      }
      return numberValue;

    case 'date':
      // Date fields: validate ISO 8601 format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
        core.error(`Cannot update field ${fieldGid}: "${rawValue}" must be YYYY-MM-DD format`);
        return null;
      }
      // Validate it's an actual valid date (check if parsing changes the value)
      const dateObj = new Date(rawValue);
      if (isNaN(dateObj.getTime())) {
        core.error(`Cannot update field ${fieldGid}: "${rawValue}" is not a valid date`);
        return null;
      }
      const roundTrip = dateObj.toISOString().split('T')[0];
      if (roundTrip !== rawValue) {
        core.error(`Cannot update field ${fieldGid}: "${rawValue}" is not a valid date`);
        return null;
      }
      return rawValue;

    default:
      core.warning(`Field ${fieldGid} has unsupported type '${schema.type}'. Skipping.`);
      return null;
  }
}

/**
 * Update Asana task with field updates from rules engine (v2)
 *
 * @param taskGid - Task GID to update
 * @param fieldUpdates - Map of field GID → value (from rules engine)
 * @param asanaToken - Asana API token
 */
export async function updateTaskFields(
  taskGid: string,
  fieldUpdates: Map<string, string>,
  asanaToken: string
): Promise<void> {
  const customFields: Record<string, string | number> = {};
  const shouldMarkComplete = fieldUpdates.has('__mark_complete');

  // Process each field update
  for (const [fieldGid, rawValue] of fieldUpdates.entries()) {
    if (fieldGid === '__mark_complete') continue;

    try {
      // Fetch field schema (with caching)
      let schema = fieldSchemaCache.get(fieldGid);
      if (!schema) {
        schema = await fetchCustomField(asanaToken, fieldGid);
        fieldSchemaCache.set(fieldGid, schema);
      }

      // Coerce the value to the appropriate type
      const coercedValue = coerceFieldValue(schema, rawValue, fieldGid);
      if (coercedValue === null) {
        continue; // Skip this field if validation failed
      }

      customFields[fieldGid] = coercedValue;
      core.info(`  ✓ Field ${fieldGid} (${schema.type}): "${rawValue}" → ${coercedValue}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      core.error(`Skipping field ${fieldGid}: ${errorMessage}`);
      // Continue with other fields
    }
  }

  // Skip if no valid fields
  if (Object.keys(customFields).length === 0 && !shouldMarkComplete) {
    core.warning(`No valid fields to update for task ${taskGid}`);
    return;
  }

  // Build update payload
  const updateData: Record<string, unknown> = {
    custom_fields: customFields,
  };

  if (shouldMarkComplete) {
    updateData.completed = true;
  }

  // Single PUT request
  core.info(
    `Updating task ${taskGid} (${Object.keys(customFields).length} field(s)${shouldMarkComplete ? ' + mark complete' : ''})...`
  );

  await withRetry(
    () =>
      asanaRequest<AsanaTask>(asanaToken, `/tasks/${taskGid}`, {
        method: 'PUT',
        body: JSON.stringify({ data: updateData }),
      }),
    `update task ${taskGid}`
  );

  core.info(`✓ Task ${taskGid} successfully updated`);
}
