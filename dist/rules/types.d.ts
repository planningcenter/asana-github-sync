/**
 * Type definitions for rules engine
 */
/**
 * Condition block - defines when a rule should execute
 * All specified conditions must match (AND logic)
 */
export interface Condition {
    event: string;
    action?: string | string[];
    merged?: boolean;
    draft?: boolean;
    label?: string;
}
/**
 * Action block - defines what to do when a rule matches
 */
export interface Action {
    update_fields: Record<string, string>;
    mark_complete?: boolean;
}
/**
 * Complete rule definition
 */
export interface Rule {
    when: Condition;
    then: Action;
}
/**
 * Top-level rules configuration
 */
export interface RulesConfig {
    rules: Rule[];
}
//# sourceMappingURL=types.d.ts.map