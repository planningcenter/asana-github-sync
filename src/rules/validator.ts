/**
 * Rules YAML validation
 */

import { RulesConfig, Rule } from './types';

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

  // Validate 'then' block
  if (!rule.then) {
    throw new Error(`${prefix} Missing 'then' block`);
  }

  if (!rule.then.update_fields || typeof rule.then.update_fields !== 'object') {
    throw new Error(`${prefix} 'update_fields' must be an object`);
  }

  if (Object.keys(rule.then.update_fields).length === 0) {
    throw new Error(`${prefix} 'update_fields' cannot be empty`);
  }

  // Validate field GIDs are numeric strings
  for (const gid of Object.keys(rule.then.update_fields)) {
    if (!/^\d+$/.test(gid)) {
      throw new Error(`${prefix} Invalid field GID '${gid}' (must be numeric)`);
    }
  }

  if (rule.then.mark_complete !== undefined && typeof rule.then.mark_complete !== 'boolean') {
    throw new Error(`${prefix} 'mark_complete' must be a boolean`);
  }
}
