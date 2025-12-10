/**
 * Task fetching operations
 */

import * as core from '@actions/core';
import type { AsanaTask } from '../../types';
import { withRetry } from '../retry';
import { asanaRequest } from './client';

/**
 * Asana attachment (partial - only fields we need)
 */
interface AsanaAttachment {
  gid: string;
  name: string;
  resource_subtype: string;
  view_url?: string;
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
 * Check if a PR is already linked to an Asana task
 * Checks task attachments to see if the PR URL already exists
 *
 * @param taskGid - Task GID to check
 * @param prUrl - PR URL to look for
 * @param asanaToken - Asana API token
 * @returns true if PR is already linked, false otherwise
 */
export async function checkIfPRAlreadyLinked(
  taskGid: string,
  prUrl: string,
  asanaToken: string
): Promise<boolean> {
  try {
    core.debug(`Checking if PR ${prUrl} is already linked to task ${taskGid}...`);

    const attachments = await withRetry(
      () =>
        asanaRequest<AsanaAttachment[]>(
          asanaToken,
          `/attachments?parent=${taskGid}&opt_fields=gid,name,resource_subtype,view_url`
        ),
      `check attachments for task ${taskGid}`
    );

    // Check if any attachment's view_url or name contains the PR URL
    const isLinked = attachments.some((attachment) => {
      // Check view_url if available
      if (attachment.view_url && attachment.view_url === prUrl) {
        return true;
      }
      // Also check name as some attachments store URL in name
      if (attachment.name && attachment.name.includes(prUrl)) {
        return true;
      }
      return false;
    });

    if (isLinked) {
      core.info(`✓ PR already linked to task ${taskGid}, skipping`);
    } else {
      core.debug(`PR not yet linked to task ${taskGid}`);
    }

    return isLinked;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.warning(`Failed to check existing links for task ${taskGid}: ${errorMessage}`);
    // On error, return false to proceed with attachment (fail open)
    return false;
  }
}
