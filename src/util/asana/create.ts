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
 * @param dryRun - If true, log actions without executing them
 * @returns Created task result
 */
export async function createTask(
  spec: CreateTaskSpec,
  asanaToken: string,
  integrationSecret: string | undefined,
  prMetadata: PRMetadata,
  dryRun = false
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
  let taskGid: string;
  let taskUrl: string;

  if (dryRun) {
    core.info(`[DRY RUN] Would create task: "${evaluatedTitle}"`);
    core.info(`[DRY RUN]   - Project: ${action.project}`);
    core.info(`[DRY RUN]   - Workspace: ${action.workspace}`);
    if (action.section) {
      core.info(`[DRY RUN]   - Section: ${action.section}`);
    }
    if (evaluatedNotes) {
      core.info(`[DRY RUN]   - Notes: ${evaluatedNotes.substring(0, 100)}${evaluatedNotes.length > 100 ? '...' : ''}`);
    }
    if (evaluatedHtmlNotes) {
      core.info(`[DRY RUN]   - HTML notes: ${evaluatedHtmlNotes.substring(0, 100)}${evaluatedHtmlNotes.length > 100 ? '...' : ''}`);
    }
    if (evaluatedAssignee) {
      core.info(`[DRY RUN]   - Assignee: ${evaluatedAssignee}`);
    }
    if (evaluatedInitialFields.size > 0) {
      core.info(`[DRY RUN]   - Initial fields: ${evaluatedInitialFields.size} field(s)`);
      for (const [fieldGid, value] of evaluatedInitialFields.entries()) {
        core.info(`[DRY RUN]     - Field ${fieldGid}: ${value}`);
      }
    }
    // Generate a fake task GID for dry-run
    taskGid = `dry-run-${Date.now()}`;
    taskUrl = `https://app.asana.com/0/${action.project}/${taskGid}`;
  } else {
    const task = await withRetry(
      () =>
        asanaRequest<AsanaTask>(asanaToken, '/tasks', {
          method: 'POST',
          body: JSON.stringify({ data: taskData }),
        }),
      'create task'
    );

    taskGid = task.gid;
    taskUrl = task.permalink_url || `https://app.asana.com/0/${action.project}/${taskGid}`;

    core.info(`✓ Task created: ${taskGid}`);
  }

  // Always remove 'me' (the integration user) as a follower to avoid notification noise
  if (!dryRun) {
    try {
      await removeTaskFollowers(taskGid, ['me'], asanaToken, dryRun);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      core.warning(`Failed to remove integration user as follower from task ${taskGid}: ${errorMessage}`);
      // Not a critical failure
    }
  } else {
    core.info(`[DRY RUN] Would remove integration user as follower from task ${taskGid}`);
  }

  // Always attach PR via integration if secret is provided
  if (integrationSecret) {
    if (!dryRun) {
      try {
        await attachPRViaIntegration(taskUrl, prMetadata, integrationSecret, dryRun);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        core.warning(`Failed to attach PR via integration: ${errorMessage}`);
        // Not a critical failure
      }
    } else {
      core.info(`[DRY RUN] Would attach PR ${prMetadata.url} to task ${taskUrl} via integration`);
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
 * @param dryRun - If true, log actions without executing them
 */
async function removeTaskFollowers(taskGid: string, followers: string[], asanaToken: string, dryRun = false): Promise<void> {
  if (dryRun) {
    core.info(`[DRY RUN] Would remove ${followers.length} follower(s) from task ${taskGid}: ${followers.join(', ')}`);
  } else {
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
}

/**
 * Attach PR via Asana-GitHub integration for rich formatting
 *
 * @param taskUrl - Task URL to attach PR to
 * @param prMetadata - PR metadata (number, title, body, url)
 * @param integrationSecret - Integration secret
 * @param dryRun - If true, log actions without executing them
 */
export async function attachPRViaIntegration(
  taskUrl: string,
  prMetadata: PRMetadata,
  integrationSecret: string,
  dryRun = false
): Promise<void> {
  core.debug(`Attaching PR ${prMetadata.url} to task via integration...`);

  if (dryRun) {
    core.info(`[DRY RUN] Would attach PR to task via integration:`);
    core.info(`[DRY RUN]   - Task URL: ${taskUrl}`);
    core.info(`[DRY RUN]   - PR #${prMetadata.number}: ${prMetadata.title}`);
    core.info(`[DRY RUN]   - PR URL: ${prMetadata.url}`);
    return;
  }

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
 * @param dryRun - If true, log actions without executing them
 * @returns Array of creation results with success status
 */
export async function createAllTasks(
  specs: CreateTaskSpec[],
  asanaToken: string,
  integrationSecret: string | undefined,
  prMetadata: PRMetadata,
  dryRun = false
): Promise<CreatedTaskResult[]> {
  const results: CreatedTaskResult[] = [];

  for (const spec of specs) {
    try {
      const result = await createTask(spec, asanaToken, integrationSecret, prMetadata, dryRun);
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
 * @param dryRun - If true, log actions without executing them
 */
export async function attachPRToExistingTasks(
  taskResults: Array<{ gid: string; name: string; url: string; success: boolean }>,
  prMetadata: PRMetadata,
  asanaToken: string,
  integrationSecret: string,
  dryRun = false
): Promise<void> {
  const { checkIfPRAlreadyLinked } = await import('./tasks');

  core.info('Attaching PR to existing Asana tasks...');

  for (const taskResult of taskResults) {
    if (!taskResult.success) {
      continue; // Skip failed tasks
    }

    try {
      // Check if PR is already linked
      const alreadyLinked = dryRun ? false : await checkIfPRAlreadyLinked(taskResult.gid, prMetadata.url, asanaToken);

      if (!alreadyLinked) {
        await attachPRViaIntegration(taskResult.url, prMetadata, integrationSecret, dryRun);
        if (!dryRun) {
          core.info(`✓ Attached PR to task ${taskResult.gid}`);
        }
      } else if (!dryRun) {
        core.info(`Skipping task ${taskResult.gid} - PR already linked`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      core.warning(`Failed to attach PR to task ${taskResult.gid}: ${errorMessage}`);
      // Continue with other tasks
    }
  }
}
