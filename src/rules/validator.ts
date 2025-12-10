/**
 * Rules YAML validation
 */

import type { RulesConfig, Rule, CreateTaskAction } from './types';

/**
 * Validate rules configuration structure
 *
 * @param config - Parsed rules configuration
 * @throws Error if validation fails
 */
export function validateRulesConfig(config: RulesConfig): void {
  if (!config.rules || !Array.isArray(config.rules)) {
    throw new Error('rules must be an array');
  }

  if (config.rules.length === 0) {
    throw new Error('rules array cannot be empty');
  }

  for (const [index, rule] of config.rules.entries()) {
    validateRule(rule, index);
  }
}

/**
 * Validate a single rule
 *
 * @param rule - Rule to validate
 * @param index - Rule index (for error messages)
 * @throws Error if validation fails
 */
function validateRule(rule: Rule, index: number): void {
  const prefix = `Rule ${index}:`;

  // Validate 'when' block
  if (!rule.when) {
    throw new Error(`${prefix} Missing 'when' block`);
  }

  if (!rule.when.event || typeof rule.when.event !== 'string') {
    throw new Error(`${prefix} 'event' must be a string`);
  }

  // Validate optional action field
  if (rule.when.action !== undefined) {
    if (typeof rule.when.action !== 'string' && !Array.isArray(rule.when.action)) {
      throw new Error(`${prefix} 'action' must be a string or array`);
    }
    if (Array.isArray(rule.when.action) && rule.when.action.length === 0) {
      throw new Error(`${prefix} 'action' array cannot be empty`);
    }
  }

  // Validate boolean fields
  if (rule.when.merged !== undefined && typeof rule.when.merged !== 'boolean') {
    throw new Error(`${prefix} 'merged' must be a boolean`);
  }

  if (rule.when.draft !== undefined && typeof rule.when.draft !== 'boolean') {
    throw new Error(`${prefix} 'draft' must be a boolean`);
  }

  if (rule.when.label !== undefined && typeof rule.when.label !== 'string') {
    throw new Error(`${prefix} 'label' must be a string`);
  }

  // Validate has_labels field
  if (rule.when.has_labels !== undefined) {
    if (typeof rule.when.has_labels !== 'string' && !Array.isArray(rule.when.has_labels)) {
      throw new Error(`${prefix} 'has_labels' must be a string or array`);
    }
    if (Array.isArray(rule.when.has_labels) && rule.when.has_labels.length === 0) {
      throw new Error(`${prefix} 'has_labels' array cannot be empty`);
    }
  }

  if (rule.when.has_asana_tasks !== undefined && typeof rule.when.has_asana_tasks !== 'boolean') {
    throw new Error(`${prefix} 'has_asana_tasks' must be a boolean`);
  }

  // Validate author field
  if (rule.when.author !== undefined) {
    if (typeof rule.when.author !== 'string' && !Array.isArray(rule.when.author)) {
      throw new Error(`${prefix} 'author' must be a string or array`);
    }
    if (Array.isArray(rule.when.author) && rule.when.author.length === 0) {
      throw new Error(`${prefix} 'author' array cannot be empty`);
    }
  }

  // Validate 'then' block
  if (!rule.then) {
    throw new Error(`${prefix} Missing 'then' block`);
  }

  // Check mutual exclusivity based on has_asana_tasks
  const hasAsanaTasks = rule.when.has_asana_tasks ?? true; // defaults to true
  const hasCreateTask = !!rule.then.create_task;
  const hasUpdateFields = rule.then.update_fields && Object.keys(rule.then.update_fields).length > 0;
  const hasMarkComplete = !!rule.then.mark_complete;
  const hasPostComment = !!rule.then.post_pr_comment;
  const hasAttachPr = !!rule.then.attach_pr_to_tasks;

  // Validate mutual exclusivity rules
  if (hasAsanaTasks === false) {
    // When has_asana_tasks: false - MUST create task, CANNOT update
    if (!hasCreateTask) {
      throw new Error(`${prefix} has_asana_tasks: false requires create_task action`);
    }
    if (hasUpdateFields) {
      throw new Error(`${prefix} has_asana_tasks: false cannot have update_fields`);
    }
    if (hasMarkComplete) {
      throw new Error(`${prefix} has_asana_tasks: false cannot have mark_complete`);
    }
    if (hasAttachPr) {
      throw new Error(`${prefix} has_asana_tasks: false cannot have attach_pr_to_tasks`);
    }
    // post_pr_comment is ALLOWED

    // Validate create_task structure
    validateCreateTaskAction(rule.then.create_task!, index);
  } else {
    // When has_asana_tasks: true (or omitted) - CANNOT create, CAN update
    if (hasCreateTask) {
      throw new Error(`${prefix} create_task requires has_asana_tasks: false`);
    }
    if (!hasUpdateFields && !hasMarkComplete && !hasPostComment && !hasAttachPr) {
      throw new Error(`${prefix} must have at least one action (update_fields, mark_complete, attach_pr_to_tasks, or post_pr_comment)`);
    }
  }

  // Validate update_fields if present
  if (rule.then.update_fields) {
    if (typeof rule.then.update_fields !== 'object') {
      throw new Error(`${prefix} 'update_fields' must be an object`);
    }

    // Validate field GIDs are numeric strings
    for (const gid of Object.keys(rule.then.update_fields)) {
      if (!/^\d+$/.test(gid)) {
        throw new Error(`${prefix} Invalid field GID '${gid}' (must be numeric)`);
      }
    }
  }

  if (rule.then.mark_complete !== undefined && typeof rule.then.mark_complete !== 'boolean') {
    throw new Error(`${prefix} 'mark_complete' must be a boolean`);
  }

  if (rule.then.post_pr_comment !== undefined) {
    if (typeof rule.then.post_pr_comment !== 'string') {
      throw new Error(`${prefix} 'post_pr_comment' must be a string`);
    }
    if (rule.then.post_pr_comment.trim().length === 0) {
      throw new Error(`${prefix} 'post_pr_comment' cannot be empty`);
    }
  }

  if (rule.then.attach_pr_to_tasks !== undefined && typeof rule.then.attach_pr_to_tasks !== 'boolean') {
    throw new Error(`${prefix} 'attach_pr_to_tasks' must be a boolean`);
  }
}

/**
 * Validate create_task action structure
 *
 * @param action - CreateTaskAction to validate
 * @param ruleIndex - Rule index (for error messages)
 * @throws Error if validation fails
 */
function validateCreateTaskAction(action: CreateTaskAction, ruleIndex: number): void {
  const prefix = `Rule ${ruleIndex}: create_task`;

  // Validate required fields
  if (!action.project || typeof action.project !== 'string') {
    throw new Error(`${prefix}.project is required and must be a string`);
  }
  if (!/^\d+$/.test(action.project)) {
    throw new Error(`${prefix}.project must be a numeric GID`);
  }

  if (!action.workspace || typeof action.workspace !== 'string') {
    throw new Error(`${prefix}.workspace is required and must be a string`);
  }
  if (!/^\d+$/.test(action.workspace)) {
    throw new Error(`${prefix}.workspace must be a numeric GID`);
  }

  if (!action.title || typeof action.title !== 'string') {
    throw new Error(`${prefix}.title is required and must be a non-empty string`);
  }

  // Validate optional section
  if (action.section !== undefined) {
    if (typeof action.section !== 'string') {
      throw new Error(`${prefix}.section must be a string`);
    }
    if (!/^\d+$/.test(action.section)) {
      throw new Error(`${prefix}.section must be a numeric GID`);
    }
  }

  // Validate notes/html_notes mutual exclusivity
  if (action.notes && action.html_notes) {
    throw new Error(`${prefix} cannot have both notes and html_notes`);
  }

  if (action.notes !== undefined && typeof action.notes !== 'string') {
    throw new Error(`${prefix}.notes must be a string`);
  }

  if (action.html_notes !== undefined && typeof action.html_notes !== 'string') {
    throw new Error(`${prefix}.html_notes must be a string`);
  }

  // Validate assignee
  if (action.assignee !== undefined && typeof action.assignee !== 'string') {
    throw new Error(`${prefix}.assignee must be a string`);
  }

  // Validate initial_fields
  if (action.initial_fields !== undefined) {
    if (typeof action.initial_fields !== 'object') {
      throw new Error(`${prefix}.initial_fields must be an object`);
    }
    for (const fieldGid of Object.keys(action.initial_fields)) {
      if (!/^\d+$/.test(fieldGid)) {
        throw new Error(`${prefix}.initial_fields has invalid GID '${fieldGid}' (must be numeric)`);
      }
    }
  }
}
