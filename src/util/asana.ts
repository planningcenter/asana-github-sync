/**
 * Asana API integration
 * Currently stubbed - logs what would be done instead of making real API calls
 */

import * as core from '@actions/core';
import { TransitionType, ActionConfig } from '../types';
import { mapTransitionToState } from './transition';

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

  // Determine if we should mark the task as complete
  const markComplete = transitionType === TransitionType.ON_MERGED && config.markCompleteOnMerge;

  // TODO: Replace with actual Asana API calls
  // 1. GET /custom_fields/{config.customFieldGid} to get enum options
  // 2. Find enum option where name matches stateName
  // 3. PUT /tasks/{taskId} with custom_fields: { customFieldGid: enumOptionGid }
  //    and optionally completed: true

  core.info('');
  core.info('🎯 WOULD UPDATE ASANA:');
  core.info(`   Task ID: ${taskId}`);
  core.info(`   Custom Field GID: ${config.customFieldGid}`);
  core.info(`   New State: ${stateName}`);
  core.info(`   Mark Complete: ${markComplete ? '✅' : '❌'}`);
  core.info(`   Token: ${config.asanaToken.substring(0, 10)}...`);
  core.info('');
}
