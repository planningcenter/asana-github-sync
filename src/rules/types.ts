/**
 * Type definitions for rules engine
 */

/**
 * Condition block - defines when a rule should execute
 * All specified conditions must match (AND logic)
 */
export interface Condition {
  event: string; // Required: GitHub event name (e.g., 'pull_request')
  action?: string | string[]; // Optional: Event action(s) (e.g., 'opened', ['opened', 'reopened'])
  merged?: boolean; // Optional: PR merged status
  draft?: boolean; // Optional: PR draft status
  label?: string; // Optional: Exact label name match
}

/**
 * Action block - defines what to do when a rule matches
 */
export interface Action {
  update_fields: Record<string, string>; // Map of field GID → value (can be template string)
  mark_complete?: boolean; // Optional: Mark task complete
  post_pr_comment?: string; // Optional: Handlebars template for PR comment
}

/**
 * Complete rule definition
 */
export interface Rule {
  when: Condition;
  then: Action;
}

/**
 * Top-level rules configuration
 */
export interface RulesConfig {
  rules: Rule[];
  comment_on_pr_when_asana_url_missing?: boolean; // Optional: Post comment when no Asana URL found (default: false)
}
