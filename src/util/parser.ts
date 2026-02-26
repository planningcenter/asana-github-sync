/**
 * Parse Asana task IDs from pull request body
 */

const extractIds = (text: string | undefined) => {
  const taskIds = new Set<string>()

  if (text) {
    // Supports two formats:
    // 1. https://app.asana.com/0/0/1211770387762076
    // 2. https://app.asana.com/1/1202585680506197/project/1207308952015558/task/1210723244258078
    const regex = /https:\/\/app\.asana\.com\/\d+\/\d+\/(?:project\/\d+\/task\/)?(\d+)/g
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      const taskId = match[1]
      if (taskId) {
        taskIds.add(taskId)
      }
    }
  }

  return taskIds
}

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
export function extractAsanaTaskIds(
  body: string | undefined,
  previousBody?: string | undefined
): {
  taskIds: string[]
  changed: boolean
} {
  const taskIds = extractIds(body)

  // If previousBody provided, check if task IDs changed
  if (previousBody !== undefined) {
    const previousTaskIds = extractIds(previousBody)
    const oldSet = new Set(previousTaskIds)
    const newSet = new Set(taskIds)

    // Check if sets are different
    const changed = oldSet.size !== newSet.size || Array.from(oldSet).some((id) => !newSet.has(id))

    return { taskIds: Array.from(taskIds), changed }
  }

  return { taskIds: Array.from(taskIds), changed: true }
}
