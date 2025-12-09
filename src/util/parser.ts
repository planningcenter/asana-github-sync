/**
 * Parse Asana task IDs from pull request body
 */

/**
 * Extract Asana task IDs from PR body text
 * Matches URLs like: https://app.asana.com/0/1234567890/9876543210
 * Returns the task IDs (last segment): ['9876543210']
 */
export function extractAsanaTaskIds(body: string | undefined): string[] {
  if (!body) {
    return [];
  }

  const taskIds = new Set<string>();
  const regex = /https:\/\/app\.asana\.com\/\d+\/\d+\/(\d+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(body)) !== null) {
    taskIds.add(match[1]);
  }

  return Array.from(taskIds);
}