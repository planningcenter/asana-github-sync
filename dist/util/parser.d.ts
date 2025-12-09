/**
 * Parse Asana task IDs from pull request body
 */
/**
 * Extract Asana task IDs from PR body text
 * Supports two URL formats:
 * - Short: https://app.asana.com/0/1234567890/9876543210
 * - Long: https://app.asana.com/1/workspace/project/projectId/task/taskId
 *
 * @param body - Current PR body
 * @param previousBody - Optional previous PR body to detect changes
 * @returns Object with taskIds array and optional changed flag
 */
export declare function extractAsanaTaskIds(body: string | undefined, previousBody?: string | undefined): {
    taskIds: string[];
    changed: boolean;
};
//# sourceMappingURL=parser.d.ts.map