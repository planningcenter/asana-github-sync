/**
 * Parse Asana task IDs from pull request body
 */
/**
 * Extract Asana task IDs from PR body text
 * Matches URLs like: https://app.asana.com/0/1234567890/9876543210
 * Returns the task IDs (last segment): ['9876543210']
 */
export declare function extractAsanaTaskIds(body: string | undefined): string[];
