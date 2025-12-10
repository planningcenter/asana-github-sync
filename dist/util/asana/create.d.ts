/**
 * Task creation operations
 */
import { CreateTaskSpec } from '../../rules/engine';
/**
 * Task creation result (includes success status)
 */
export interface CreatedTaskResult {
    gid: string;
    name: string;
    url: string;
    success: boolean;
}
/**
 * Create a new Asana task from evaluated specification
 *
 * @param spec - Task creation specification from rules engine
 * @param asanaToken - Asana API token
 * @param integrationSecret - Optional integration secret for rich PR attachment
 * @param prUrl - PR URL for integration attachment
 * @returns Created task result
 */
export declare function createTask(spec: CreateTaskSpec, asanaToken: string, integrationSecret: string | undefined, prUrl: string): Promise<CreatedTaskResult>;
/**
 * Create all tasks from specs
 * Handles failures gracefully per-task
 *
 * @param specs - Array of task creation specifications
 * @param asanaToken - Asana API token
 * @param integrationSecret - Optional integration secret
 * @param prUrl - PR URL for integration attachment
 * @returns Array of creation results with success status
 */
export declare function createAllTasks(specs: CreateTaskSpec[], asanaToken: string, integrationSecret: string | undefined, prUrl: string): Promise<CreatedTaskResult[]>;
//# sourceMappingURL=create.d.ts.map