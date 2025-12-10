/**
 * Utilities for analyzing templates in rules
 */

import type { Rule } from '../rules/types';

/**
 * Check if any rule uses a specific Handlebars helper
 *
 * @param rules - Array of rules to analyze
 * @param helperName - Name of the helper to search for (e.g., 'extract_from_comments')
 * @returns true if any template uses the helper
 */
export function rulesUseHelper(rules: Rule[], helperName: string): boolean {
  const pattern = new RegExp(`\\{\\{\\s*${helperName}\\s+`, 'g');

  for (const rule of rules) {
    // Check update_fields if present
    if (rule.then.update_fields) {
      for (const template of Object.values(rule.then.update_fields)) {
        if (pattern.test(template)) {
          return true;
        }
      }
    }
  }

  return false;
}
