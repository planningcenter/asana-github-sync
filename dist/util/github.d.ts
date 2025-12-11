/**
 * GitHub API utilities
 */
import type { HandlebarsContext, CommentContext } from '../expression/context';
/**
 * Fetch all comments for a pull request
 *
 * @param githubToken - GitHub authentication token
 * @param prNumber - Pull request number
 * @returns Concatenated comment bodies, or empty string on error
 */
export declare function fetchPRComments(githubToken: string, prNumber: number): Promise<string>;
/**
 * Post a comment to a pull request
 *
 * @param githubToken - GitHub authentication token
 * @param prNumber - Pull request number
 * @param body - Comment body (markdown supported)
 * @param dryRun - If true, log actions without executing them
 */
export declare function postPRComment(githubToken: string, prNumber: number, body: string, dryRun?: boolean): Promise<void>;
/**
 * Evaluate and post multiple comment templates to a PR with deduplication
 *
 * @param commentTemplates - Array of Handlebars templates
 * @param githubToken - GitHub authentication token
 * @param prNumber - Pull request number
 * @param commentContext - Context object for template evaluation
 * @param evaluateTemplate - Template evaluation function
 * @param dryRun - If true, log actions without executing them
 */
export declare function postCommentTemplates(commentTemplates: string[], githubToken: string, prNumber: number, commentContext: CommentContext, evaluateTemplate: (template: string, context: HandlebarsContext | CommentContext) => string, dryRun?: boolean): Promise<void>;
/**
 * Append Asana task link to PR body
 *
 * @param githubToken - GitHub authentication token
 * @param prNumber - Pull request number
 * @param taskName - Name of created task
 * @param taskUrl - URL of created task
 * @param dryRun - If true, log actions without executing them
 */
export declare function appendAsanaLinkToPR(githubToken: string, prNumber: number, taskName: string, taskUrl: string, dryRun?: boolean): Promise<void>;
//# sourceMappingURL=github.d.ts.map