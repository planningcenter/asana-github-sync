/**
 * Rules engine - condition matching and execution
 */

import * as core from '@actions/core';
import type * as github from '@actions/github';
import type { Rule, Condition, CreateTaskAction } from './types';
import { evaluateTemplate } from '../expression/evaluator';
import type { HandlebarsContext, CommentContext } from '../expression/context';

/**
 * Context for rule evaluation (strongly typed from GitHub)
 */
export interface RuleContext {
  eventName: string;
  action: string;
  pr?: {                // Only present for pull_request events
    number: number;
    title: string;
    body: string;
    merged: boolean;
    draft: boolean;
    author: string;
    assignee?: string;
    base_ref: string;
    head_ref: string;
    url: string;
  };
  issue?: {             // Only present for issues events
    number: number;
    title: string;
    body: string;
    author: string;
    assignee?: string;
    url: string;
    state: string;
  };
  label?: {
    name: string;
  };
  labels?: string[];   // All labels on the PR or issue
  comments?: string;   // All comments concatenated (if fetched)
  hasAsanaTasks: boolean;
  userMappings?: Record<string, string>;
}

/**
 * Build rule context from GitHub context
 *
 * @param githubContext - GitHub Actions context
 * @param comments - Optional comments (pre-fetched if needed by caller)
 * @param hasAsanaTasks - Whether the body contains Asana task links
 * @param userMappings - Optional GitHub username → Asana user GID mapping
 * @returns Strongly-typed context for rules engine
 */
export function buildRuleContext(
  githubContext: Pick<typeof github.context, 'eventName' | 'payload'>,
  comments: string | undefined,
  hasAsanaTasks: boolean,
  userMappings?: Record<string, string>
): RuleContext {
  const { eventName, payload } = githubContext;

  const context: RuleContext = {
    eventName,
    action: payload.action || '',
    hasAsanaTasks,
  };

  if (eventName === 'pull_request') {
    const pr = payload.pull_request;
    if (!pr) {
      throw new Error('No pull_request in GitHub payload');
    }
    context.pr = {
      number: pr.number,
      title: pr.title,
      body: pr.body || '',
      merged: pr.merged || false,
      draft: pr.draft || false,
      author: pr.user.login,
      assignee: pr.assignee?.login,
      base_ref: pr.base.ref,
      head_ref: pr.head.ref,
      url: pr.html_url || '',
    };
    if (payload.label) {
      context.label = { name: payload.label.name };
    }
    if (pr.labels && Array.isArray(pr.labels)) {
      context.labels = pr.labels.map((label: { name: string }) => label.name);
    }
  } else if (eventName === 'issues') {
    const issue = payload.issue;
    if (!issue) {
      throw new Error('No issue in GitHub payload');
    }
    context.issue = {
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      author: issue.user.login,
      assignee: issue.assignee?.login,
      url: issue.html_url || '',
      state: issue.state || 'open',
    };
    if (payload.label) {
      context.label = { name: payload.label.name };
    }
    if (issue.labels && Array.isArray(issue.labels)) {
      context.labels = issue.labels.map((label: { name: string }) => label.name);
    }
  } else {
    throw new Error(`Unsupported event: ${eventName}. Supported events: pull_request, issues`);
  }

  if (comments !== undefined) {
    context.comments = comments;
  }

  if (userMappings !== undefined) {
    context.userMappings = userMappings;
  }

  return context;
}

/**
 * Check if a condition matches the current context
 *
 * @param condition - Rule condition to evaluate
 * @param context - Current PR/event context
 * @returns true if all specified conditions match (AND logic)
 */
export function matchesCondition(condition: Condition, context: RuleContext): boolean {
  // Event must match exactly
  if (condition.event !== context.eventName) {
    return false;
  }

  // Action (if specified) must match
  if (condition.action !== undefined) {
    const actions = Array.isArray(condition.action) ? condition.action : [condition.action];
    if (!actions.includes(context.action)) {
      return false;
    }
  }

  // Merged (if specified) - only applies to pull_request events
  if (condition.merged !== undefined) {
    if (!context.pr || condition.merged !== context.pr.merged) {
      return false;
    }
  }

  // Draft (if specified) - only applies to pull_request events
  if (condition.draft !== undefined) {
    if (!context.pr || condition.draft !== context.pr.draft) {
      return false;
    }
  }

  // Label (if specified) must match
  if (condition.label !== undefined) {
    if (!context.label || condition.label !== context.label.name) {
      return false;
    }
  }

  // has_labels (if specified) - PR must have at least one of the specified labels
  if (condition.has_labels !== undefined) {
    const requiredLabels = Array.isArray(condition.has_labels)
      ? condition.has_labels
      : [condition.has_labels];
    const prLabels = context.labels || [];
    const hasMatch = requiredLabels.some((label) => prLabels.includes(label));
    if (!hasMatch) {
      return false;
    }
  }

  // has_asana_tasks (if specified) must match
  if (condition.has_asana_tasks !== undefined) {
    if (condition.has_asana_tasks !== context.hasAsanaTasks) {
      return false;
    }
  }

  // Author (if specified) must match - works for both PR and issue events
  if (condition.author !== undefined) {
    const authors = Array.isArray(condition.author) ? condition.author : [condition.author];
    const author = context.pr?.author || context.issue?.author || '';
    if (!authors.includes(author)) {
      return false;
    }
  }

  return true;
}

/**
 * Task creation specification (evaluated from rule)
 */
export interface CreateTaskSpec {
  action: CreateTaskAction; // Original action config
  evaluatedTitle: string; // Evaluated title template
  evaluatedNotes?: string; // Evaluated notes template
  evaluatedHtmlNotes?: string; // Evaluated html_notes template
  evaluatedAssignee?: string; // Evaluated assignee template
  evaluatedInitialFields: Map<string, string>; // Evaluated initial field values
}

/**
 * Result of rule execution
 */
export interface RuleExecutionResult {
  fieldUpdates: Map<string, string>; // Map of field GID → evaluated value
  commentTemplates: string[]; // Array of PR comment templates from matching rules
  taskCreationSpecs: CreateTaskSpec[]; // Array of task creation specifications
  attachPrToTasks: boolean; // Whether to attach PR to existing tasks via integration
}

/**
 * Execute all matching rules and collect field updates
 *
 * @param rules - Array of rules to evaluate
 * @param context - Current PR/event context (strongly typed)
 * @returns Field updates and comment templates from matching rules
 */
export function executeRules(rules: Rule[], context: RuleContext): RuleExecutionResult {
  const fieldUpdates = new Map<string, string>();
  const commentTemplates: string[] = [];
  const taskCreationSpecs: CreateTaskSpec[] = [];
  let shouldMarkComplete = false;
  let attachPrToTasks = false;

  for (const [index, rule] of rules.entries()) {
    if (!matchesCondition(rule.when, context)) {
      core.debug(`Rule ${index}: condition not met`);
      continue;
    }

    core.debug(`Rule ${index}: condition matched, executing action`);

    // Convert to Handlebars context for template evaluation
    const handlebarsContext = {
      pr: context.pr,
      issue: context.issue,
      event: {
        name: context.eventName,
        action: context.action,
      },
      label: context.label,
      comments: context.comments,
      userMappings: context.userMappings,
    };

    // Handle task creation if present
    if (rule.then.create_task) {
      try {
        const spec = evaluateCreateTaskSpec(rule.then.create_task, handlebarsContext, index);
        taskCreationSpecs.push(spec);
        core.debug(`  Will create task: "${spec.evaluatedTitle}"`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        core.error(`Failed to evaluate create_task for rule ${index}: ${errorMessage}`);
        // Continue with other rules
      }
    }

    // Evaluate each field template with Handlebars
    if (rule.then.update_fields) {
      for (const [fieldGid, template] of Object.entries(rule.then.update_fields)) {
        try {
          const value = evaluateTemplate(template, handlebarsContext);

          // Skip empty values - usually means extraction found nothing
          // NOTE: Whitespace is preserved. Only exactly '' (empty string) is skipped.
          // TODO(docs): Document this behavior - fields with empty template results are skipped
          if (value === '') {
            core.debug(`  Field ${fieldGid} skipped (empty value)`);
            continue;
          }

          // Last rule wins for conflicting fields
          fieldUpdates.set(fieldGid, value);
          core.debug(`  Field ${fieldGid} = "${value}"`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          core.error(`Failed to evaluate field ${fieldGid}: ${errorMessage}`);
          // Continue with other fields
        }
      }
    }

    // Aggregate mark_complete flag (any rule can set it)
    if (rule.then.mark_complete) {
      shouldMarkComplete = true;
    }

    // Aggregate attach_pr_to_tasks flag (any rule can set it)
    if (rule.then.attach_pr_to_tasks) {
      attachPrToTasks = true;
      core.debug(`  Will attach PR to existing Asana tasks`);
    }

    // Collect comment template if present
    if (rule.then.post_pr_comment) {
      commentTemplates.push(rule.then.post_pr_comment);
      core.debug(`  Will post PR comment (template ${commentTemplates.length})`);
    }
  }

  // Add special flag for task completion
  if (shouldMarkComplete) {
    fieldUpdates.set('__mark_complete', 'true');
  }

  return { fieldUpdates, commentTemplates, taskCreationSpecs, attachPrToTasks };
}

/**
 * Evaluate create_task action and build task creation specification
 *
 * @param action - CreateTaskAction to evaluate
 * @param handlebarsContext - Context for template evaluation
 * @param ruleIndex - Rule index for error messages
 * @returns Evaluated task creation specification
 */
function evaluateCreateTaskSpec(
  action: CreateTaskAction,
  handlebarsContext: HandlebarsContext,
  ruleIndex: number
): CreateTaskSpec {
  // Evaluate title (required)
  const evaluatedTitle = evaluateTemplate(action.title, handlebarsContext);
  if (!evaluatedTitle) {
    throw new Error(`Rule ${ruleIndex}: create_task.title evaluated to empty string`);
  }

  // Evaluate optional notes
  let evaluatedNotes: string | undefined;
  if (action.notes) {
    evaluatedNotes = evaluateTemplate(action.notes, handlebarsContext);
  }

  // Evaluate optional html_notes
  let evaluatedHtmlNotes: string | undefined;
  if (action.html_notes) {
    evaluatedHtmlNotes = evaluateTemplate(action.html_notes, handlebarsContext);
  }

  // Evaluate optional assignee
  let evaluatedAssignee: string | undefined;
  if (action.assignee) {
    evaluatedAssignee = evaluateTemplate(action.assignee, handlebarsContext);
    // Empty string means no assignee (mapping not found)
    if (evaluatedAssignee === '') {
      evaluatedAssignee = undefined;
    }
  }

  // Evaluate initial fields
  const evaluatedInitialFields = new Map<string, string>();
  if (action.initial_fields) {
    for (const [fieldGid, template] of Object.entries(action.initial_fields)) {
      try {
        const value = evaluateTemplate(template, handlebarsContext);
        // Skip empty values (similar to update_fields behavior)
        if (value !== '') {
          evaluatedInitialFields.set(fieldGid, value);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        core.warning(`Rule ${ruleIndex}: Failed to evaluate initial field ${fieldGid}: ${errorMessage}`);
        // Continue with other fields
      }
    }
  }

  return {
    action,
    evaluatedTitle,
    evaluatedNotes,
    evaluatedHtmlNotes,
    evaluatedAssignee,
    evaluatedInitialFields,
  };
}

/**
 * Build Handlebars context for comment template evaluation
 *
 * @param ruleContext - Original rule context (PR, event data)
 * @param taskResults - Array of task update results with success status
 * @param fieldUpdates - Map of field updates that were applied
 * @returns Handlebars context object for comment templates
 */
export function buildCommentContext(
  ruleContext: RuleContext,
  taskResults: Array<{ gid: string; name: string; url: string; success: boolean }>,
  fieldUpdates: Map<string, string>
): CommentContext {
  const successCount = taskResults.filter((t) => t.success).length;
  const failedCount = taskResults.filter((t) => !t.success).length;

  return {
    pr: ruleContext.pr,
    issue: ruleContext.issue,
    event: {
      name: ruleContext.eventName,
      action: ruleContext.action,
    },
    comments: ruleContext.comments,
    tasks: taskResults,
    updates: {
      fields: Array.from(fieldUpdates.entries())
        .filter(([gid]) => gid !== '__mark_complete')
        .map(([gid, value]) => ({ gid, value })),
      mark_complete: fieldUpdates.has('__mark_complete'),
    },
    summary: {
      total: taskResults.length,
      success: successCount,
      failed: failedCount,
    },
  };
}
