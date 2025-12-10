/**
 * GitHub API utilities
 */
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
 */
export declare function postPRComment(githubToken: string, prNumber: number, body: string): Promise<void>;
/**
 * Post a comment prompting for Asana URL if not already posted
 *
 * @param githubToken - GitHub authentication token
 * @param prNumber - Pull request number
 */
export declare function postMissingAsanaUrlPrompt(githubToken: string, prNumber: number): Promise<void>;
/**
 * Evaluate and post multiple comment templates to a PR with deduplication
 *
 * @param commentTemplates - Array of Handlebars templates
 * @param githubToken - GitHub authentication token
 * @param prNumber - Pull request number
 * @param commentContext - Context object for template evaluation
 * @param evaluateTemplate - Template evaluation function
 */
export declare function postCommentTemplates(commentTemplates: string[], githubToken: string, prNumber: number, commentContext: any, evaluateTemplate: (template: string, context: any) => string): Promise<void>;
//# sourceMappingURL=github.d.ts.map