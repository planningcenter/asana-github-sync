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
export declare function rulesUseHelper(rules: Rule[], helperName: string): boolean;
//# sourceMappingURL=template-analysis.d.ts.map