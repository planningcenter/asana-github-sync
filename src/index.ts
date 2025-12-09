/**
 * Entry point for Asana-GitHub Sync Action
 * v2.0: Rules engine with YAML-based configuration
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { readRulesConfig } from './util/config';
import { validateRulesConfig } from './rules/validator';
import { buildRuleContext, executeRules } from './rules/engine';
import { extractAsanaTaskIds } from './util/parser';
import { updateTaskFields } from './util/asana';

async function run(): Promise<void> {
  try {
    // Read and validate rules configuration
    core.info('Reading rules configuration...');
    const { asanaToken, githubToken, rules } = readRulesConfig();

    validateRulesConfig(rules);

    core.info(`✓ Rules configuration loaded`);
    core.info(`  - Asana token: ${asanaToken.substring(0, 3)}...`);
    core.info(`  - GitHub token: ${githubToken.substring(0, 3)}...`);
    core.info(`  - Rules: ${rules.rules.length} rule(s) configured`);

    // Build rule context from GitHub event
    const context = buildRuleContext(github.context);

    core.info(`Event: ${context.eventName}, Action: ${context.action}`);
    core.info(`PR #${context.pr.number}: ${context.pr.title}`);

    // Extract Asana task IDs from PR body
    const { taskIds } = extractAsanaTaskIds(context.pr.body);

    if (taskIds.length === 0) {
      core.info('No Asana task links found in PR body, skipping');
      return;
    }

    core.info(`Found ${taskIds.length} Asana task(s): ${taskIds.join(', ')}`);

    // Execute rules to get field updates
    const fieldUpdates = executeRules(rules.rules, context);

    if (fieldUpdates.size === 0) {
      core.info('No rules matched, skipping');
      return;
    }

    core.info(`${fieldUpdates.size} field update(s) to apply`);

    // Update all Asana tasks
    let successCount = 0;
    const failedTasks: string[] = [];

    for (const taskId of taskIds) {
      try {
        await updateTaskFields(taskId, fieldUpdates, asanaToken);
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
    core.setOutput('task_ids', taskIds.join(','));
    core.setOutput('tasks_updated', successCount.toString());

  } catch (error) {
    // NEVER fail the workflow - just log the error
    if (error instanceof Error) {
      core.error(`Action error: ${error.message}`);
      core.debug(error.stack || 'No stack trace available');
    } else {
      core.error(`Action error: ${String(error)}`);
    }
  }
}

run();