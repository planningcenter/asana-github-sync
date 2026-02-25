/**
 * Context types for Handlebars templates
 * Used for template evaluation in rules engine
 */
/**
 * PR context available in templates
 */
export interface PRContext {
    number: number;
    title: string;
    body: string;
    merged: boolean;
    draft: boolean;
    author: string;
    base_ref: string;
    head_ref: string;
    url: string;
}
/**
 * Issue context available in templates
 */
export interface IssueContext {
    number: number;
    title: string;
    body: string;
    author: string;
    assignee?: string;
    url: string;
    state: string;
    labels?: string[];
}
/**
 * Event context available in templates
 */
export interface EventContext {
    name: string;
    action: string;
}
/**
 * Label context (only present for labeled events)
 */
export interface LabelContext {
    name: string;
}
/**
 * Complete Handlebars context for template evaluation
 */
export interface HandlebarsContext {
    pr?: PRContext;
    issue?: IssueContext;
    event: EventContext;
    label?: LabelContext;
    comments?: string;
    userMappings?: Record<string, string>;
}
/**
 * Task result for comment template evaluation
 */
export interface TaskResult {
    gid: string;
    name: string;
    url: string;
    success: boolean;
}
/**
 * Comment context for post-execution PR/issue comment templates
 * Includes task results and update summary
 */
export interface CommentContext {
    pr?: PRContext;
    issue?: IssueContext;
    event: EventContext;
    comments?: string;
    tasks: TaskResult[];
    updates: {
        fields: Array<{
            gid: string;
            value: string;
        }>;
        mark_complete: boolean;
    };
    summary: {
        total: number;
        success: number;
        failed: number;
    };
}
//# sourceMappingURL=context.d.ts.map