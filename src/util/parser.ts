/**
 * Parse Asana task IDs from pull request body
 */

const extractIds = (text: string | undefined) => {
  const taskIds = new Set<string>();

  if (text) {
    const regex = /https:\/\/app\.asana\.com\/\d+\/\d+\/(\d+)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      taskIds.add(match[1]);
    }
  }

  return taskIds;
};

/**
 * Extract Asana task IDs from PR body text
 * Matches URLs like: https://app.asana.com/0/1234567890/9876543210
 *
 * @param body - Current PR body
 * @param previousBody - Optional previous PR body to detect changes
 * @returns Object with taskIds array and optional changed flag
 */
export function extractAsanaTaskIds(
  body: string | undefined,
  previousBody?: string | undefined
): {
  taskIds: string[];
  changed: boolean;
} {
  const taskIds = extractIds(body);

  // If previousBody provided, check if task IDs changed
  if (previousBody !== undefined) {
    const previousTaskIds = extractIds(previousBody);
    const oldSet = new Set(previousTaskIds);
    const newSet = new Set(taskIds);

    // Check if sets are different
    const changed =
      oldSet.size !== newSet.size ||
      Array.from(oldSet).some(id => !newSet.has(id));

    return { taskIds: Array.from(taskIds), changed };
  }

  return { taskIds: Array.from(taskIds), changed: true };
}