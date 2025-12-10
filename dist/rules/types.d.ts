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
    has_labels?: string | string[];
    has_asana_tasks?: boolean;
    author?: string | string[];
}
/**
 * Task creation action - defines properties for creating a new Asana task
 */
export interface CreateTaskAction {
    project: string;
    workspace: string;
    section?: string;
    title: string;
    notes?: string;
    html_notes?: string;
    assignee?: string;
    initial_fields?: Record<string, string>;
}
/**
 * Action block - defines what to do when a rule matches
 */
export interface Action {
    create_task?: CreateTaskAction;
    update_fields?: Record<string, string>;
    mark_complete?: boolean;
    post_pr_comment?: string;
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
    user_mappings?: Record<string, string>;
    integration_secret?: string;
}
//# sourceMappingURL=types.d.ts.map