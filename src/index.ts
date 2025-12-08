/**
 * Entry point for Asana-GitHub Sync Action
 * MVP: Logs what would be done (no actual Asana API calls yet)
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { readConfig } from './config';
import { extractAsanaTaskIds } from './parser';

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

    // Parse Asana task IDs from PR body
    const taskIds = extractAsanaTaskIds(pr.body);

    if (taskIds.length === 0) {
      core.info('No Asana task links found in PR body');
      return;
    }

    core.info(`Found ${taskIds.length} Asana task(s): ${taskIds.join(', ')}`);

    // For MVP: only handle first task
    const taskId = taskIds[0];
    if (taskIds.length > 1) {
      core.warning(`Multiple tasks found, only syncing first task: ${taskId}`);
    }

    // Determine target state based on event
    let targetState: string | null = null;

    if (payload.action === 'opened' && !pr.draft) {
      targetState = config.stateOnOpened;
    } else if (payload.action === 'closed' && pr.merged) {
      targetState = config.stateOnMerged;
    }

    if (!targetState) {
      core.info(`No state transition needed for action: ${payload.action}`);
      return;
    }

    // LOG what we would do (no actual API call yet)
    core.info('');
    core.info('🎯 WOULD UPDATE ASANA:');
    core.info(`   Task ID: ${taskId}`);
    core.info(`   Custom Field GID: ${config.customFieldGid}`);
    core.info(`   New State: ${targetState}`);
    core.info('');

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