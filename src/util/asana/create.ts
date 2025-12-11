/**
 * Task creation operations
 */

import * as core from '@actions/core';
import type { AsanaTask } from '../../types';
import { withRetry } from '../retry';
import { asanaRequest } from './client';
import { getFieldSchema, coerceFieldValue } from './fields';
import type { CreateTaskSpec } from '../../rules/engine';

/**
 * PR metadata for integration attachment
 */
export interface PRMetadata {
  number: number;
  title: string;
  body: string;
  url: string;
}

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
 * @param prMetadata - PR metadata for integration attachment
 * @returns Created task result
 */
export async function createTask(
  spec: CreateTaskSpec,
  asanaToken: string,
  integrationSecret: string | undefined,
  prMetadata: PRMetadata
): Promise<CreatedTaskResult> {
  const { action, evaluatedTitle, evaluatedNotes, evaluatedHtmlNotes, evaluatedAssignee, evaluatedInitialFields } =
    spec;

  core.debug(`Creating task: "${evaluatedTitle}" in project ${action.project}...`);

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

  // Always remove 'me' (the integration user) as a follower to avoid notification noise
  try {
    await removeTaskFollowers(taskGid, ['me'], asanaToken);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.warning(`Failed to remove integration user as follower from task ${taskGid}: ${errorMessage}`);
    // Not a critical failure
  }

  // Always attach PR via integration if secret is provided
  if (integrationSecret) {
    try {
      await attachPRViaIntegration(taskUrl, prMetadata, integrationSecret);
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

  core.debug(`✓ Removed ${followers.length} follower(s) from task ${taskGid}`);
}

/**
 * Attach PR via Asana-GitHub integration for rich formatting
 *
 * @param taskUrl - Task URL to attach PR to
 * @param prMetadata - PR metadata (number, title, body, url)
 * @param integrationSecret - Integration secret
 */
export async function attachPRViaIntegration(
  taskUrl: string,
  prMetadata: PRMetadata,
  integrationSecret: string,
): Promise<void> {
  core.debug(`Attaching PR ${prMetadata.url} to task via integration...`);

  // Build full PR description including task link (matching reference implementation)
  const prDescription = `${prMetadata.body || ''}\n\n---\n\nAsana task: [${taskUrl}](${taskUrl})`;

  const payload = {
    pullRequestDescription: prDescription,
    pullRequestName: prMetadata.title,
    pullRequestNumber: prMetadata.number,
    pullRequestURL: prMetadata.url,
  };

  // Use AbortController for 30s timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch('https://github.integrations.asana.plus/custom/v1/actions/widget', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integrationSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const responseText = await response.text();

    if (response.ok) {
      core.info('✓ PR attached via integration');
    } else {
      core.warning(`⚠️ Integration attachment failed with status ${response.status}: ${responseText}`);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      core.warning('⏱️ Integration attachment timed out after 30 seconds, but the operation completed successfully');
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      core.warning(`❌ Integration attachment failed: ${errorMessage}, but the operation completed successfully`);
    }
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
 * @param prMetadata - PR metadata for integration attachment
 * @returns Array of creation results with success status
 */
export async function createAllTasks(
  specs: CreateTaskSpec[],
  asanaToken: string,
  integrationSecret: string | undefined,
  prMetadata: PRMetadata
): Promise<CreatedTaskResult[]> {
  const results: CreatedTaskResult[] = [];

  for (const spec of specs) {
    try {
      const result = await createTask(spec, asanaToken, integrationSecret, prMetadata);
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

/**
 * Attach PR to existing Asana tasks via integration
 * Checks for existing links before attaching to avoid duplicates
 *
 * @param taskResults - Array of task results to attach PR to
 * @param prMetadata - PR metadata for integration attachment
 * @param asanaToken - Asana API token (for checking existing links)
 * @param integrationSecret - Integration secret for attachment
 */
export async function attachPRToExistingTasks(
  taskResults: Array<{ gid: string; name: string; url: string; success: boolean }>,
  prMetadata: PRMetadata,
  asanaToken: string,
  integrationSecret: string
): Promise<void> {
  const { checkIfPRAlreadyLinked } = await import('./tasks');

  core.info('Attaching PR to existing Asana tasks...');

  for (const taskResult of taskResults) {
    if (!taskResult.success) {
      continue; // Skip failed tasks
    }

    try {
      // Check if PR is already linked
      const alreadyLinked = await checkIfPRAlreadyLinked(taskResult.gid, prMetadata.url, asanaToken);

      if (!alreadyLinked) {
        await attachPRViaIntegration(taskResult.url, prMetadata, integrationSecret);
        core.info(`✓ Attached PR to task ${taskResult.gid}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      core.warning(`Failed to attach PR to task ${taskResult.gid}: ${errorMessage}`);
      // Continue with other tasks
    }
  }
}
