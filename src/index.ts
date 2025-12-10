/**
 * Entry point for Asana-GitHub Sync Action
 * v2.0: Rules engine with YAML-based configuration
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { readRulesConfig } from './util/config';
import { validateRulesConfig } from './rules/validator';
import { buildRuleContext, executeRules, buildCommentContext } from './rules/engine';
import { extractAsanaTaskIds } from './util/parser';
import { fetchAllTaskDetails, updateAllTasks, createAllTasks } from './util/asana';
import { appendAsanaLinkToPR } from './util/github';
import { registerHelpers } from './expression/helpers';
import { rulesUseHelper } from './util/template-analysis';
import { fetchPRComments, postCommentTemplates } from './util/github';
import { evaluateTemplate } from './expression/evaluator';

/**
 * Task details fetched from Asana
 */
interface TaskDetails {
  gid: string;
  name: string;
  url: string;
}

async function run(): Promise<void> {
  try {
    // Register Handlebars helpers for template evaluation
    registerHelpers();

    // Read and validate rules configuration
    core.info('Reading rules configuration...');
    const { asanaToken, githubToken, rules, userMappings, integrationSecret } = readRulesConfig();

    validateRulesConfig(rules);

    core.info(`✓ Rules configuration loaded`);
    core.info(`  - Asana token: ${asanaToken.substring(0, 3)}...`);
    core.info(`  - GitHub token: ${githubToken.substring(0, 3)}...`);
    core.info(`  - Rules: ${rules.rules.length} rule(s) configured`);
    if (Object.keys(userMappings).length > 0) {
      core.info(`  - User mappings: ${Object.keys(userMappings).length} mapping(s)`);
    }
    if (integrationSecret) {
      core.info(`  - Integration secret: configured`);
    }

    // Check if any rule uses extract_from_comments helper
    const needsComments = rulesUseHelper(rules.rules, 'extract_from_comments');
    let comments: string | undefined;

    if (needsComments) {
      core.info('Rules use extract_from_comments, fetching PR comments...');
      const prNumber = github.context.payload.pull_request?.number;

      if (prNumber) {
        comments = await fetchPRComments(githubToken, prNumber);
      } else {
        core.warning('No PR number found in payload, cannot fetch comments');
        comments = '';
      }
    }

    // Extract Asana task IDs from PR body to determine hasAsanaTasks
    const prBody = github.context.payload.pull_request?.body || '';
    const { taskIds } = extractAsanaTaskIds(prBody);
    const hasAsanaTasks = taskIds.length > 0;

    // Build rule context from GitHub event
    const context = buildRuleContext(github.context, comments, hasAsanaTasks, userMappings);

    core.info(`Event: ${context.eventName}, Action: ${context.action}`);
    core.info(`PR #${context.pr.number}: ${context.pr.title}`);
    core.info(`has_asana_tasks: ${hasAsanaTasks}`);

    // Execute rules to get field updates, comment templates, and task creation specs
    const { fieldUpdates, commentTemplates, taskCreationSpecs } = executeRules(rules.rules, context);

    // SPLIT EXECUTION PATH: Task creation vs. updates
    if (taskCreationSpecs.length > 0) {
      // PATH A: Task Creation Mode
      core.info(`Creating ${taskCreationSpecs.length} task(s)...`);

      const prNumber = github.context.payload.pull_request?.number;
      if (!prNumber) {
        core.error('No PR number found in payload, cannot create tasks');
        return;
      }

      const createdTasks = await createAllTasks(
        taskCreationSpecs,
        asanaToken,
        integrationSecret,
        {
          number: context.pr.number,
          title: context.pr.title,
          body: context.pr.body,
          url: context.pr.url,
        }
      );

      const successCount = createdTasks.filter((t) => t.success).length;
      const failedCount = createdTasks.filter((t) => !t.success).length;

      // Update PR body with task links
      for (const task of createdTasks) {
        if (task.success) {
          await appendAsanaLinkToPR(githubToken, prNumber, task.name, task.url);
        }
      }

      // Post PR comments if configured
      if (commentTemplates.length > 0) {
        const commentContext = buildCommentContext(context, createdTasks, fieldUpdates);
        await postCommentTemplates(commentTemplates, githubToken, prNumber, commentContext, evaluateTemplate);
      }

      // Log summary
      core.info('');
      core.info(`=== Creation Summary ===`);
      core.info(`Total tasks created: ${successCount} of ${taskCreationSpecs.length}`);
      if (failedCount > 0) {
        const failedTaskNames = createdTasks.filter((t) => !t.success).map((t) => t.name);
        core.info(`✗ Failed: ${failedCount} (${failedTaskNames.join(', ')})`);
      }
      core.info('');

      // Set outputs
      const createdTaskIds = createdTasks.filter((t) => t.success).map((t) => t.gid).join(',');
      core.setOutput('task_ids', createdTaskIds);
      core.setOutput('tasks_created', successCount.toString());

    } else if (taskIds.length > 0) {
      // PATH B: Update Existing Tasks (existing logic)
      core.info(`Found ${taskIds.length} Asana task(s): ${taskIds.join(', ')}`);

      if (fieldUpdates.size === 0 && commentTemplates.length === 0) {
        core.info('No rules matched, skipping');
        return;
      }

      core.info(`${fieldUpdates.size} field update(s) to apply`);
      if (commentTemplates.length > 0) {
        core.info(`${commentTemplates.length} PR comment(s) configured`);
      }

      // Fetch task details if comment templates exist
      let taskDetails: TaskDetails[] = [];

      if (commentTemplates.length > 0) {
        taskDetails = await fetchAllTaskDetails(taskIds, asanaToken);
      }

      // Update all Asana tasks and collect results
      const taskResults = await updateAllTasks(taskIds, taskDetails, fieldUpdates, asanaToken);

      const successCount = taskResults.filter((t) => t.success).length;
      const failedCount = taskResults.filter((t) => !t.success).length;

      // Post PR comments if configured
      if (commentTemplates.length > 0) {
        const prNumber = github.context.payload.pull_request?.number;

        if (prNumber) {
          const commentContext = buildCommentContext(context, taskResults, fieldUpdates);
          await postCommentTemplates(commentTemplates, githubToken, prNumber, commentContext, evaluateTemplate);
        } else {
          core.warning('No PR number found in payload, cannot post comments');
        }
      }

      // Log summary
      core.info('');
      core.info(`=== Update Summary ===`);
      core.info(`Total tasks: ${taskResults.length}`);
      core.info(`✓ Successful: ${successCount}`);
      if (failedCount > 0) {
        const failedTaskIds = taskResults.filter((t) => !t.success).map((t) => t.gid);
        core.info(`✗ Failed: ${failedCount} (${failedTaskIds.join(', ')})`);
      }
      core.info('');

      // Set outputs
      core.setOutput('task_ids', taskIds.join(','));
      core.setOutput('tasks_updated', successCount.toString());

    } else {
      // No tasks found and no task creation rules matched
      core.info('No Asana task links found in PR body');
    }

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