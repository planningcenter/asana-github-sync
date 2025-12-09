/**
 * Entry point for Asana-GitHub Sync Action
 * MVP: Logs what would be done (no actual Asana API calls yet)
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { readConfig } from './util/config';
import { extractAsanaTaskIds } from './util/parser';
import { validateTaskCount } from './util/validation';
import { determineTransitionType } from './util/transition';
import { updateTaskStatus } from './util/asana';

async function run(): Promise<void> {
  try {
    // Read configuration
    core.info('Reading action configuration...');
    const config = readConfig();
    core.info(`✓ Configuration loaded`);
    core.info(`  - Asana token: ${config.asanaToken.substring(0, 3)}...`);
    core.info(`  - Custom field GID: ${config.customFieldGid}`);
    core.info(`  - State on opened: ${config.stateOnOpened}`);
    core.info(`  - State on merged: ${config.stateOnMerged}`);

    // Get event context
    const context = github.context;
    const { eventName, payload } = context;

    core.info(`Event: ${eventName}, Action: ${payload.action}`);

    // Only process pull_request events
    if (eventName !== 'pull_request') {
      core.info('Not a pull_request event, skipping');
      return;
    }

    const pr = payload.pull_request;
    if (!pr) {
      core.warning('No pull_request in payload, skipping');
      return;
    }

    core.info(`PR #${pr.number}: ${pr.title}`);

    // Skip draft PRs
    if (pr.draft) {
      core.info('PR is in draft, skipping. ⚠️ MVP does not support draft mode ⚠️');
      return;
    }

    const parseResult = extractAsanaTaskIds(pr.body, payload.changes?.body?.from);

    core.info(`Found ${parseResult.taskIds.length} Asana task(s): ${parseResult.taskIds.join(', ')}`);

    if (parseResult.changed) {
      core.info('Asana task links changed in PR body');
    } else {
      core.info('PR body edited but Asana task links unchanged, skipping');
      return;
    }

    // Validate task count
    const taskValidation = validateTaskCount(parseResult.taskIds.length);
    if (!taskValidation.valid) {
      if (taskValidation.level === "info") {
        core.info(taskValidation.reason!);
      } else {
        core.warning(taskValidation.reason!);
      }
      return;
    }

    const taskIds = parseResult.taskIds;

    // Determine transition type based on event
    const transitionType = determineTransitionType(payload.action, pr.merged);

    if (!transitionType) {
      core.info(`No state transition needed for action: ${payload.action}`);
      return;
    }

    // Update all Asana tasks
    core.info(`Transition: ${transitionType}`);
    let successCount = 0;
    const failedTasks: string[] = [];

    for (const taskId of taskIds) {
      try {
        await updateTaskStatus(taskId, transitionType, config);
        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        core.error(`Failed to update task ${taskId}: ${errorMessage}`);
        failedTasks.push(taskId);
      }
    }

    // Log summary
    core.info('');
    core.info(`=== Update Summary ===`);
    core.info(`Total tasks: ${taskIds.length}`);
    core.info(`✓ Successful: ${successCount}`);
    if (failedTasks.length > 0) {
      core.info(`✗ Failed: ${failedTasks.length} (${failedTasks.join(', ')})`);
    }
    core.info('');

    // Set outputs
    core.setOutput('tasks_updated', successCount.toString());
    core.setOutput('task_ids', taskIds.join(','));

  } catch (error) {
    // NEVER fail the workflow - just log the error
    if (error instanceof Error) {
      core.error(`Action error: ${error.message}`);
    } else {
      core.error(`Action error: ${String(error)}`);
    }
  }
}

run();