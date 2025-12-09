/**
 * Validation utilities for PR processing
 */
export type ValidationResult = {
    valid: true;
} | {
    valid: false;
    level: "info" | "warning";
    reason: string;
};
/**
 * Check if task count is valid (supports multiple tasks)
 */
export declare function validateTaskCount(taskCount: number): ValidationResult;
//# sourceMappingURL=validation.d.ts.map