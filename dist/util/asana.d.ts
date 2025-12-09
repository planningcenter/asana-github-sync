/**
 * Asana API integration using direct HTTP requests
 */
import { TransitionType, ActionConfig } from '../types';
/**
 * Update an Asana task based on transition type (v1 compatibility)
 *
 * @param taskId - The Asana task GID
 * @param transitionType - The type of transition (ON_OPENED, ON_MERGED)
 * @param config - Action configuration
 */
export declare function updateTaskStatus(taskId: string, transitionType: TransitionType, config: ActionConfig): Promise<void>;
/**
 * Update Asana task with field updates from rules engine (v2)
 *
 * @param taskGid - Task GID to update
 * @param fieldUpdates - Map of field GID → value (from rules engine)
 * @param asanaToken - Asana API token
 */
export declare function updateTaskFields(taskGid: string, fieldUpdates: Map<string, string>, asanaToken: string): Promise<void>;
//# sourceMappingURL=asana.d.ts.map