/**
 * Task creation operations
 */

import * as core from '@actions/core';
import { AsanaTask } from '../../types';
import { withRetry } from '../retry';
import { asanaRequest } from './client';
import { getFieldSchema, coerceFieldValue } from './fields';
import { CreateTaskSpec } from '../../rules/engine';

/**
 * Task creation result (includes success status)
 */
export interface CreatedTaskResult {
  gid: string;
  name: string;
  url: string;
  success: boolean;
}

/**
 * Create a new Asana task from evaluated specification
 *
 * @param spec - Task creation specification from rules engine
 * @param asanaToken - Asana API token
 * @param integrationSecret - Optional integration secret for rich PR attachment
 * @param prUrl - PR URL for integration attachment
 * @returns Created task result
 */
export async function createTask(
  spec: CreateTaskSpec,
  asanaToken: string,
  integrationSecret: string | undefined,
  prUrl: string
): Promise<CreatedTaskResult> {
  const { action, evaluatedTitle, evaluatedNotes, evaluatedHtmlNotes, evaluatedAssignee, evaluatedInitialFields } =
    spec;

  core.info(`Creating task: "${evaluatedTitle}" in project ${action.project}...`);

  // Build task data
  const taskData: Record<string, unknown> = {
    name: evaluatedTitle,
    projects: [action.project],
    workspace: action.workspace,
  };

  // Add section membership if specified
  if (action.section) {
    taskData.memberships = [{ project: action.project, section: action.section }];
  }

  // Add notes or html_notes
  if (evaluatedNotes) {
    taskData.notes = evaluatedNotes;
  }
  if (evaluatedHtmlNotes) {
    taskData.html_notes = evaluatedHtmlNotes;
  }

  // Add assignee
  if (evaluatedAssignee) {
    taskData.assignee = evaluatedAssignee;
  }

  // Add initial custom field values
  if (evaluatedInitialFields.size > 0) {
    const customFields: Record<string, string | number> = {};

    for (const [fieldGid, rawValue] of evaluatedInitialFields.entries()) {
      try {
        // Fetch field schema (with caching)
        const schema = await getFieldSchema(asanaToken, fieldGid);

        // Coerce the value to the appropriate type
        const coercedValue = coerceFieldValue(schema, rawValue, fieldGid);
        if (coercedValue !== null) {
          customFields[fieldGid] = coercedValue;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        core.warning(`Failed to set initial field ${fieldGid}: ${errorMessage}`);
        // Continue with other fields
      }
    }

    if (Object.keys(customFields).length > 0) {
      taskData.custom_fields = customFields;
    }
  }

  // Create task
  const task = await withRetry(
    () =>
      asanaRequest<AsanaTask>(asanaToken, '/tasks', {
        method: 'POST',
        body: JSON.stringify({ data: taskData }),
      }),
    'create task'
  );

  const taskGid = task.gid;
  const taskUrl = task.permalink_url || `https://app.asana.com/0/${action.project}/${taskGid}`;

  core.info(`✓ Task created: ${taskGid}`);

  // Remove followers if specified
  if (action.remove_followers && action.remove_followers.length > 0) {
    try {
      await removeTaskFollowers(taskGid, action.remove_followers, asanaToken);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      core.warning(`Failed to remove followers from task ${taskGid}: ${errorMessage}`);
      // Not a critical failure
    }
  }

  // Always attach PR via integration if secret is provided
  if (integrationSecret) {
    try {
      await attachPRViaIntegration(taskGid, prUrl, integrationSecret, asanaToken);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      core.warning(`Failed to attach PR via integration: ${errorMessage}`);
      // Not a critical failure
    }
  }

  return {
    gid: taskGid,
    name: evaluatedTitle,
    url: taskUrl,
    success: true,
  };
}

/**
 * Remove followers from a task
 *
 * @param taskGid - Task GID
 * @param followers - Array of follower identifiers (e.g., ["me"])
 * @param asanaToken - Asana API token
 */
async function removeTaskFollowers(taskGid: string, followers: string[], asanaToken: string): Promise<void> {
  for (const follower of followers) {
    core.debug(`Removing follower ${follower} from task ${taskGid}...`);

    await withRetry(
      () =>
        asanaRequest(asanaToken, `/tasks/${taskGid}/removeFollowers`, {
          method: 'POST',
          body: JSON.stringify({ data: { followers: [follower] } }),
        }),
      `remove follower ${follower}`
    );
  }

  core.info(`✓ Removed ${followers.length} follower(s) from task ${taskGid}`);
}

/**
 * Attach PR via Asana-GitHub integration for rich formatting
 *
 * @param taskGid - Task GID to attach PR to
 * @param prUrl - GitHub PR URL
 * @param integrationSecret - Integration secret
 * @param asanaToken - Asana API token
 */
async function attachPRViaIntegration(
  taskGid: string,
  prUrl: string,
  integrationSecret: string,
  asanaToken: string
): Promise<void> {
  core.info(`Attaching PR ${prUrl} to task ${taskGid} via integration...`);

  // Extract domain from PR URL
  const domain = new URL(prUrl).hostname; // e.g., "github.com"

  const attachmentData = {
    resource_url: prUrl,
    secret: integrationSecret,
  };

  // Use AbortController for 30s timeout (matches script 2 behavior)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`https://app.asana.com/api/1.0/external/${domain}/attachments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${asanaToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          resource: taskGid,
          ...attachmentData,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Integration API error: ${response.status} ${response.statusText}: ${errorBody}`);
    }

    core.info(`✓ PR attached via integration`);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Create all tasks from specs
 * Handles failures gracefully per-task
 *
 * @param specs - Array of task creation specifications
 * @param asanaToken - Asana API token
 * @param integrationSecret - Optional integration secret
 * @param prUrl - PR URL for integration attachment
 * @returns Array of creation results with success status
 */
export async function createAllTasks(
  specs: CreateTaskSpec[],
  asanaToken: string,
  integrationSecret: string | undefined,
  prUrl: string
): Promise<CreatedTaskResult[]> {
  const results: CreatedTaskResult[] = [];

  for (const spec of specs) {
    try {
      const result = await createTask(spec, asanaToken, integrationSecret, prUrl);
      results.push(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      core.error(`Failed to create task "${spec.evaluatedTitle}": ${errorMessage}`);
      results.push({
        gid: '',
        name: spec.evaluatedTitle,
        url: '',
        success: false,
      });
    }
  }

  return results;
}
