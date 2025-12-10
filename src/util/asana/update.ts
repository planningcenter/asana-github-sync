/**
 * Task update operations
 */

import * as core from '@actions/core';
import type { AsanaTask } from '../../types';
import { withRetry } from '../retry';
import { asanaRequest } from './client';
import { getFieldSchema, coerceFieldValue } from './fields';

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
      const schema = await getFieldSchema(asanaToken, fieldGid);

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
