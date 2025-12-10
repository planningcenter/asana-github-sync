/**
 * Task fetching operations
 */

import * as core from '@actions/core';
import { AsanaTask } from '../../types';
import { withRetry } from '../retry';
import { asanaRequest } from './client';

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
