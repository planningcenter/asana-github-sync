/**
 * Entry point for Asana-GitHub Sync Action
 * MVP: Logs what would be done (no actual Asana API calls yet)
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { readConfig } from './util/config';
import { extractAsanaTaskIds } from './util/parser';
import { validateTaskCount } from './util/validation';
import { determineTransitionType, mapTransitionToState } from './util/transition';
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

    // Parse Asana task IDs from PR body
    const taskIds = extractAsanaTaskIds(pr.body);

    core.info(`Found ${taskIds.length} Asana task(s): ${taskIds.join(', ')}`);

    // Validate single task for MVP
    const taskValidation = validateTaskCount(taskIds.length);
    if (!taskValidation.valid) {
      if (taskValidation.level === "info") {
        core.info(taskValidation.reason!);
      } else {
        core.warning(taskValidation.reason!);
      }
      return;
    }

    const taskId = taskIds[0];

    // Determine transition type based on event
    const transitionType = determineTransitionType(payload.action, pr.merged);

    if (!transitionType) {
      core.info(`No state transition needed for action: ${payload.action}`);
      return;
    }

    const targetState = mapTransitionToState(transitionType, config);

    if (!targetState) {
      core.error(`Failed to map transition type ${transitionType} to state`);
      return;
    }

    // Update Asana task (currently stubbed - just logs)
    core.info(`Transition: ${transitionType} → ${targetState}`);
    await updateTaskStatus(taskId, config.customFieldGid, targetState, config.asanaToken);

    // Set outputs
    core.setOutput('tasks_updated', '1');
    core.setOutput('task_ids', taskId);

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