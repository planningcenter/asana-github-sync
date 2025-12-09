/**
 * Asana API integration using direct HTTP requests
 */

import * as core from '@actions/core';
import { TransitionType, ActionConfig, AsanaCustomField, AsanaEnumOption, AsanaTask } from '../types';
import { mapTransitionToState } from './transition';
import { withRetry } from './retry';
import { ApiError, isApiError } from './errors';

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
 * Update task with new custom field value and optionally mark complete
 *
 * @param token - Asana Personal Access Token
 * @param taskId - Task GID
 * @param customFieldGid - Custom field GID
 * @param enumGid - Enum option GID
 * @param markComplete - Whether to mark task as complete
 */
async function updateTask(
  token: string,
  taskId: string,
  customFieldGid: string,
  enumGid: string,
  markComplete: boolean
): Promise<void> {
  const updateData: Record<string, unknown> = {
    custom_fields: {
      [customFieldGid]: enumGid,
    },
  };

  if (markComplete) {
    updateData.completed = true;
  }

  await withRetry(
    () =>
      asanaRequest<AsanaTask>(token, `/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ data: updateData }),
      }),
    `update task ${taskId}`
  );
}


/**
 * Log error based on HTTP status code
 *
 * @param error - The error object
 * @param context - Context for error message (e.g., 'custom field 123', 'task 456')
 */
function logApiError(error: unknown, context: string): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const status = isApiError(error) ? (error.status || error.statusCode) : undefined;

  if (status === 401 || status === 403) {
    core.error(`Authentication failed. Check that asana_token is valid and has access to ${context}`);
  } else if (status === 404) {
    core.error(`${context} not found. It may have been deleted or you lack access.`);
  } else if (status === 400) {
    core.error(
      `Invalid request for ${context}: ${errorMessage}. This may indicate incomplete dependencies or a bug in the action.`
    );
  } else {
    core.error(`Failed operation for ${context}: ${errorMessage}`);
  }
}

/**
 * Update an Asana task based on transition type
 *
 * @param taskId - The Asana task GID
 * @param transitionType - The type of transition (ON_OPENED, ON_MERGED)
 * @param config - Action configuration
 */
export async function updateTaskStatus(
  taskId: string,
  transitionType: TransitionType,
  config: ActionConfig
): Promise<void> {
  const stateName = mapTransitionToState(transitionType, config);

  if (!stateName) {
    core.error(`Failed to map transition type ${transitionType} to state`);
    return;
  }

  const markComplete = transitionType === TransitionType.ON_MERGED && config.markCompleteOnMerge;

  try {
    // Fetch custom field definition
    const customField = await fetchCustomField(config.asanaToken, config.customFieldGid);

    // Find matching enum option
    const enumGid = findEnumOption(customField, stateName, config.customFieldGid);
    if (!enumGid) {
      core.error(`Cannot update task ${taskId}: state "${stateName}" not found in custom field`);
      return;
    }

    // Update task
    core.info(`Updating task ${taskId} to state "${stateName}"${markComplete ? ' and marking complete' : ''}...`);
    await updateTask(config.asanaToken, taskId, config.customFieldGid, enumGid, markComplete);
    core.info(`✓ Task ${taskId} successfully updated to "${stateName}"`);
  } catch (error) {
    if (error instanceof Error) {
      logApiError(error, `task ${taskId}`);
      core.debug(error.stack || 'No stack trace available');
    } else {
      core.error(`Unexpected error updating Asana task ${taskId}: ${String(error)}`);
    }
  }
}
