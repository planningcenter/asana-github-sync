/**
 * Asana API integration using direct HTTP requests
 */
/**
 * Clear the field schema cache (primarily for testing)
 */
export declare function clearFieldSchemaCache(): void;
/**
 * Fetch task details (name and URL)
 *
 * @param taskGid - Task GID to fetch
 * @param asanaToken - Asana API token
 * @returns Task details with gid, name, and url
 */
export declare function fetchTaskDetails(taskGid: string, asanaToken: string): Promise<{
    gid: string;
    name: string;
    url: string;
}>;
/**
 * Fetch details for multiple tasks
 * Handles failures gracefully by using placeholder details
 *
 * @param taskGids - Array of task GIDs to fetch
 * @param asanaToken - Asana API token
 * @returns Array of task details (with placeholders for failed fetches)
 */
export declare function fetchAllTaskDetails(taskGids: string[], asanaToken: string): Promise<Array<{
    gid: string;
    name: string;
    url: string;
}>>;
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
//# sourceMappingURL=asana.d.ts.map