/**
 * Rules engine - condition matching and execution
 */
import * as github from '@actions/github';
import { Rule, Condition } from './types';
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
    comments?: string;
}
/**
 * Build rule context from GitHub context
 *
 * @param githubContext - GitHub Actions context
 * @param comments - Optional PR comments (pre-fetched if needed by caller)
 * @returns Strongly-typed context for rules engine
 */
export declare function buildRuleContext(githubContext: Pick<typeof github.context, 'eventName' | 'payload'>, comments?: string): RuleContext;
/**
 * Check if a condition matches the current context
 *
 * @param condition - Rule condition to evaluate
 * @param context - Current PR/event context
 * @returns true if all specified conditions match (AND logic)
 */
export declare function matchesCondition(condition: Condition, context: RuleContext): boolean;
/**
 * Result of rule execution
 */
export interface RuleExecutionResult {
    fieldUpdates: Map<string, string>;
    commentTemplates: string[];
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
}>, fieldUpdates: Map<string, string>): {
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
    event: {
        name: string;
        action: string;
    };
    tasks: {
        gid: string;
        name: string;
        url: string;
        success: boolean;
    }[];
    updates: {
        fields: {
            gid: string;
            value: string;
        }[];
        mark_complete: boolean;
    };
    summary: {
        total: number;
        success: number;
        failed: number;
    };
};
//# sourceMappingURL=engine.d.ts.map