/**
 * Task fetching operations
 */
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
//# sourceMappingURL=tasks.d.ts.map