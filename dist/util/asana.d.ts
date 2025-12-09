/**
 * Asana API integration
 * Currently stubbed - logs what would be done instead of making real API calls
 */
/**
 * Update an Asana task's custom field to a new state
 *
 * @param taskId - The Asana task GID
 * @param customFieldGid - The custom field GID to update
 * @param stateName - The target state name (e.g., "Ready for Review", "Done")
 * @param asanaToken - Asana Personal Access Token
 */
export declare function updateTaskStatus(taskId: string, customFieldGid: string, stateName: string, asanaToken: string): Promise<void>;
//# sourceMappingURL=asana.d.ts.map