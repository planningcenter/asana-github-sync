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
 * Check if task count is valid (supports multiple tasks)
 */
export function validateTaskCount(taskCount: number): ValidationResult {
  if (taskCount === 0) {
    return {
      valid: false,
      level: "info",
      reason: 'No Asana task links found in PR body',
    };
  } else {
    return { valid: true };
  }
}
