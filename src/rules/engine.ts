/**
 * Rules engine - condition matching and execution
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { Rule, Condition } from './types';
import { evaluateTemplate } from '../expression/evaluator';

/**
 * Context for rule evaluation (strongly typed from GitHub)
 */
export interface RuleContext {
  eventName: string;
  action: string;
  pr: {
    number: number;
    title: string;
    body: string;
    merged: boolean;
    draft: boolean;
    author: string;
    base_ref: string;
    head_ref: string;
    url: string;
  };
  label?: {
    name: string;
  };
}

/**
 * Build rule context from GitHub context
 *
 * @param githubContext - GitHub Actions context
 * @returns Strongly-typed context for rules engine
 */
export function buildRuleContext(
  githubContext: Pick<typeof github.context, 'eventName' | 'payload'>
): RuleContext {
  const { eventName, payload } = githubContext;
  const pr = payload.pull_request;

  if (!pr) {
    throw new Error('No pull_request in GitHub payload');
  }

  const context: RuleContext = {
    eventName,
    action: payload.action || '',
    pr: {
      number: pr.number,
      title: pr.title,
      body: pr.body || '',
      merged: pr.merged || false,
      draft: pr.draft || false,
      author: pr.user.login,
      base_ref: pr.base.ref,
      head_ref: pr.head.ref,
      url: pr.html_url || '',
    },
  };

  if (payload.label) {
    context.label = {
      name: payload.label.name,
    };
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

  // Merged (if specified) must match
  if (condition.merged !== undefined && condition.merged !== context.pr.merged) {
    return false;
  }

  // Draft (if specified) must match
  if (condition.draft !== undefined && condition.draft !== context.pr.draft) {
    return false;
  }

  // Label (if specified) must match
  if (condition.label !== undefined) {
    if (!context.label || condition.label !== context.label.name) {
      return false;
    }
  }

  return true;
}

/**
 * Execute all matching rules and collect field updates
 *
 * @param rules - Array of rules to evaluate
 * @param context - Current PR/event context (strongly typed)
 * @returns Map of field GID → evaluated value, plus special __mark_complete flag if needed
 */
export function executeRules(rules: Rule[], context: RuleContext): Map<string, string> {
  const fieldUpdates = new Map<string, string>();
  let shouldMarkComplete = false;

  for (const [index, rule] of rules.entries()) {
    if (!matchesCondition(rule.when, context)) {
      core.debug(`Rule ${index}: condition not met`);
      continue;
    }

    core.info(`Rule ${index}: condition matched, executing action`);

    // Convert to Handlebars context for template evaluation
    const handlebarsContext = {
      pr: context.pr,
      event: {
        name: context.eventName,
        action: context.action,
      },
      label: context.label,
    };

    // Evaluate each field template with Handlebars
    for (const [fieldGid, template] of Object.entries(rule.then.update_fields)) {
      try {
        const value = evaluateTemplate(template, handlebarsContext);

        // Last rule wins for conflicting fields
        fieldUpdates.set(fieldGid, value);
        core.info(`  Field ${fieldGid} = "${value}"`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        core.error(`Failed to evaluate field ${fieldGid}: ${errorMessage}`);
        // Continue with other fields
      }
    }

    // Aggregate mark_complete flag (any rule can set it)
    if (rule.then.mark_complete) {
      shouldMarkComplete = true;
    }
  }

  // Add special flag for task completion
  if (shouldMarkComplete) {
    fieldUpdates.set('__mark_complete', 'true');
  }

  return fieldUpdates;
}
