/**
 * Task update operations
 */
/**
 * Task update result (includes success status)
 */
export interface TaskUpdateResult {
    gid: string;
    name: string;
    url: string;
    success: boolean;
}
/**
 * Update multiple tasks with the same field updates
 * Handles failures gracefully and tracks success/failure per task
 *
 * @param taskIds - Array of task GIDs to update
 * @param taskDetails - Array of task details (parallel to taskIds)
 * @param fieldUpdates - Map of field updates to apply
 * @param asanaToken - Asana API token
 * @returns Array of task results with success status
 */
export declare function updateAllTasks(taskIds: string[], taskDetails: Array<{
    gid: string;
    name: string;
    url: string;
}>, fieldUpdates: Map<string, string>, asanaToken: string): Promise<TaskUpdateResult[]>;
/**
 * Update Asana task with field updates from rules engine (v2)
 *
 * @param taskGid - Task GID to update
 * @param fieldUpdates - Map of field GID → value (from rules engine)
 * @param asanaToken - Asana API token
 */
export declare function updateTaskFields(taskGid: string, fieldUpdates: Map<string, string>, asanaToken: string): Promise<void>;
//# sourceMappingURL=update.d.ts.map