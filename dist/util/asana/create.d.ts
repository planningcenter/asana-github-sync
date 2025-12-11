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
 * @param dryRun - If true, log actions without executing them
 * @returns Created task result
 */
export declare function createTask(spec: CreateTaskSpec, asanaToken: string, integrationSecret: string | undefined, prMetadata: PRMetadata, dryRun?: boolean): Promise<CreatedTaskResult>;
/**
 * Attach PR via Asana-GitHub integration for rich formatting
 *
 * @param taskUrl - Task URL to attach PR to
 * @param prMetadata - PR metadata (number, title, body, url)
 * @param integrationSecret - Integration secret
 * @param dryRun - If true, log actions without executing them
 */
export declare function attachPRViaIntegration(taskUrl: string, prMetadata: PRMetadata, integrationSecret: string, dryRun?: boolean): Promise<void>;
/**
 * Create all tasks from specs
 * Handles failures gracefully per-task
 *
 * @param specs - Array of task creation specifications
 * @param asanaToken - Asana API token
 * @param integrationSecret - Optional integration secret
 * @param prMetadata - PR metadata for integration attachment
 * @param dryRun - If true, log actions without executing them
 * @returns Array of creation results with success status
 */
export declare function createAllTasks(specs: CreateTaskSpec[], asanaToken: string, integrationSecret: string | undefined, prMetadata: PRMetadata, dryRun?: boolean): Promise<CreatedTaskResult[]>;
/**
 * Attach PR to existing Asana tasks via integration
 * Checks for existing links before attaching to avoid duplicates
 *
 * @param taskResults - Array of task results to attach PR to
 * @param prMetadata - PR metadata for integration attachment
 * @param asanaToken - Asana API token (for checking existing links)
 * @param integrationSecret - Integration secret for attachment
 * @param dryRun - If true, log actions without executing them
 */
export declare function attachPRToExistingTasks(taskResults: Array<{
    gid: string;
    name: string;
    url: string;
    success: boolean;
}>, prMetadata: PRMetadata, asanaToken: string, integrationSecret: string, dryRun?: boolean): Promise<void>;
//# sourceMappingURL=create.d.ts.map