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
  has_asana_tasks?: boolean; // Optional: Whether PR has Asana task links (default: true)
  author?: string | string[]; // Optional: PR author username(s)
}

/**
 * Task creation action - defines properties for creating a new Asana task
 */
export interface CreateTaskAction {
  project: string; // Required: Project GID
  workspace: string; // Required: Workspace GID
  section?: string; // Optional: Section GID for task placement
  title: string; // Required: Task title (template string)
  notes?: string; // Optional: Plain text notes (template string, mutually exclusive with html_notes)
  html_notes?: string; // Optional: HTML formatted notes (template string, mutually exclusive with notes)
  assignee?: string; // Optional: Assignee user GID or "me" (template string)
  initial_fields?: Record<string, string>; // Optional: Initial custom field values (field GID → template)
  // Note: The integration user ('me') is always removed as a follower after task creation
}

/**
 * Action block - defines what to do when a rule matches
 */
export interface Action {
  create_task?: CreateTaskAction; // Optional: Create a new Asana task
  update_fields?: Record<string, string>; // Optional: Map of field GID → value (can be template string)
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
  user_mappings?: Record<string, string>; // Optional: GitHub username → Asana user GID
  integration_secret?: string; // Optional: Asana-GitHub integration secret for rich PR attachments
}
