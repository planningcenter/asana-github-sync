/**
 * Context builder for Handlebars templates
 * Extracts PR metadata from GitHub context for use in expressions
 */
import * as github from '@actions/github';
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
    pr: PRContext;
    event: EventContext;
    label?: LabelContext;
}
/**
 * Build Handlebars context from GitHub event payload
 *
 * @param githubContext - GitHub Actions context object (or partial for testing)
 * @returns Context object for Handlebars template evaluation
 */
export declare function buildContext(githubContext: Pick<typeof github.context, 'eventName' | 'payload'>): HandlebarsContext;
//# sourceMappingURL=context.d.ts.map