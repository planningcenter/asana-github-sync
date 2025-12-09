/**
 * Validation utilities for PR processing
 */

export type ValidationResult = {
  valid: true
} | {
  valid: false
  level: "info" | "warning";
  reason: string;
}

/**
 * Check if task count is valid for MVP (single task only)
 */
export function validateTaskCount(taskCount: number): ValidationResult {
  if (taskCount === 0) {
    return {
      valid: false,
      level: "info",
      reason: 'No Asana task links found in PR body',
    };
  } else if (taskCount > 1) {
    return {
      valid: false,
      level: "warning",
      reason: `Multiple tasks found (${taskCount}), skipping sync. ⚠️ MVP only supports single task per PR ⚠️`,
    };
  } else {
    return { valid: true };
  }
}
