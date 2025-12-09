/**
 * Asana API integration using direct HTTP requests
 */

import * as core from '@actions/core';
import { AsanaCustomField, AsanaEnumOption, AsanaTask } from '../types';
import { withRetry } from './retry';
import { ApiError } from './errors';

const ASANA_API_BASE = 'https://app.asana.com/api/1.0';

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
async function fetchCustomField(token: string, customFieldGid: string): Promise<AsanaCustomField> {
  core.info(`Fetching custom field ${customFieldGid}...`);
  return await withRetry(
    () => asanaRequest<AsanaCustomField>(token, `/custom_fields/${customFieldGid}`),
    `fetch custom field ${customFieldGid}`
  );
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
  const customFields: Record<string, string> = {};
  const shouldMarkComplete = fieldUpdates.has('__mark_complete');

  // Cache for fetched custom field schemas
  const fieldSchemaCache = new Map<string, AsanaCustomField>();

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

      // For MVP, we only support enum fields
      if (schema.type !== 'enum') {
        core.warning(
          `Field ${fieldGid} is type '${schema.type}', not 'enum'. Only enum fields supported in MVP.`
        );
        continue;
      }

      // Find matching enum option
      const enumGid = findEnumOption(schema, rawValue, fieldGid);
      if (!enumGid) {
        core.error(`Cannot update field ${fieldGid}: value "${rawValue}" not found`);
        continue;
      }

      customFields[fieldGid] = enumGid;
      core.info(`  ✓ Field ${fieldGid} (enum): "${rawValue}" → ${enumGid}`);
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
