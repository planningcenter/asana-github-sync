/**
 * Asana API integration
 * Currently stubbed - logs what would be done instead of making real API calls
 */
import { TransitionType, ActionConfig } from '../types';
/**
 * Update an Asana task based on transition type
 *
 * @param taskId - The Asana task GID
 * @param transitionType - The type of transition (ON_OPENED, ON_MERGED)
 * @param config - Action configuration
 */
export declare function updateTaskStatus(taskId: string, transitionType: TransitionType, config: ActionConfig): Promise<void>;
//# sourceMappingURL=asana.d.ts.map