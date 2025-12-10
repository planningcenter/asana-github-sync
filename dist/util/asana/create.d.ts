/**
 * Task creation operations
 */
import type { CreateTaskSpec } from '../../rules/engine';
/**
 * PR metadata for integration attachment
 */
export interface PRMetadata {
    number: number;
    title: string;
    body: string;
    url: string;
}
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
 * @param prMetadata - PR metadata for integration attachment
 * @returns Created task result
 */
export declare function createTask(spec: CreateTaskSpec, asanaToken: string, integrationSecret: string | undefined, prMetadata: PRMetadata): Promise<CreatedTaskResult>;
/**
 * Create all tasks from specs
 * Handles failures gracefully per-task
 *
 * @param specs - Array of task creation specifications
 * @param asanaToken - Asana API token
 * @param integrationSecret - Optional integration secret
 * @param prMetadata - PR metadata for integration attachment
 * @returns Array of creation results with success status
 */
export declare function createAllTasks(specs: CreateTaskSpec[], asanaToken: string, integrationSecret: string | undefined, prMetadata: PRMetadata): Promise<CreatedTaskResult[]>;
//# sourceMappingURL=create.d.ts.map