/**
 * Rules engine - condition matching and execution
 */
import type * as github from '@actions/github';
import type { Rule, Condition, CreateTaskAction } from './types';
import type { CommentContext } from '../expression/context';
/**
 * Context for rule evaluation (strongly typed from GitHub)
 */
export interface RuleContext {
    eventName: string;
    action: string;
    pr?: {
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
    issue?: {
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
    labels?: string[];
    comments?: string;
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
export declare function buildRuleContext(githubContext: Pick<typeof github.context, 'eventName' | 'payload'>, comments: string | undefined, hasAsanaTasks: boolean, userMappings?: Record<string, string>): RuleContext;
/**
 * Check if a condition matches the current context
 *
 * @param condition - Rule condition to evaluate
 * @param context - Current PR/event context
 * @returns true if all specified conditions match (AND logic)
 */
export declare function matchesCondition(condition: Condition, context: RuleContext): boolean;
/**
 * Task creation specification (evaluated from rule)
 */
export interface CreateTaskSpec {
    action: CreateTaskAction;
    evaluatedTitle: string;
    evaluatedNotes?: string;
    evaluatedHtmlNotes?: string;
    evaluatedAssignee?: string;
    evaluatedInitialFields: Map<string, string>;
}
/**
 * Result of rule execution
 */
export interface RuleExecutionResult {
    fieldUpdates: Map<string, string>;
    commentTemplates: string[];
    taskCreationSpecs: CreateTaskSpec[];
    attachPrToTasks: boolean;
}
/**
 * Execute all matching rules and collect field updates
 *
 * @param rules - Array of rules to evaluate
 * @param context - Current PR/event context (strongly typed)
 * @returns Field updates and comment templates from matching rules
 */
export declare function executeRules(rules: Rule[], context: RuleContext): RuleExecutionResult;
/**
 * Build Handlebars context for comment template evaluation
 *
 * @param ruleContext - Original rule context (PR, event data)
 * @param taskResults - Array of task update results with success status
 * @param fieldUpdates - Map of field updates that were applied
 * @returns Handlebars context object for comment templates
 */
export declare function buildCommentContext(ruleContext: RuleContext, taskResults: Array<{
    gid: string;
    name: string;
    url: string;
    success: boolean;
}>, fieldUpdates: Map<string, string>): CommentContext;
//# sourceMappingURL=engine.d.ts.map