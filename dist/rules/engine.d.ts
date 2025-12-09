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
}
/**
 * Build rule context from GitHub context
 *
 * @param githubContext - GitHub Actions context
 * @returns Strongly-typed context for rules engine
 */
export declare function buildRuleContext(githubContext: Pick<typeof github.context, 'eventName' | 'payload'>): RuleContext;
/**
 * Check if a condition matches the current context
 *
 * @param condition - Rule condition to evaluate
 * @param context - Current PR/event context
 * @returns true if all specified conditions match (AND logic)
 */
export declare function matchesCondition(condition: Condition, context: RuleContext): boolean;
/**
 * Execute all matching rules and collect field updates
 *
 * @param rules - Array of rules to evaluate
 * @param context - Current PR/event context (strongly typed)
 * @returns Map of field GID → evaluated value, plus special __mark_complete flag if needed
 */
export declare function executeRules(rules: Rule[], context: RuleContext): Map<string, string>;
//# sourceMappingURL=engine.d.ts.map