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
/**
 * Check if a PR is already linked to an Asana task
 * Checks task attachments to see if the PR URL already exists
 *
 * @param taskGid - Task GID to check
 * @param prUrl - PR URL to look for
 * @param asanaToken - Asana API token
 * @returns true if PR is already linked, false otherwise
 */
export declare function checkIfPRAlreadyLinked(taskGid: string, prUrl: string, asanaToken: string): Promise<boolean>;
//# sourceMappingURL=tasks.d.ts.map