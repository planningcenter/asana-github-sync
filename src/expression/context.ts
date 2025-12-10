/**
 * Context types for Handlebars templates
 * Used for template evaluation in rules engine
 */

/**
 * PR context available in templates
 */
export interface PRContext {
  number: number;
  title: string;
  body: string;
  merged: boolean;
  draft: boolean;
  author: string;
  base_ref: string;
  head_ref: string;
  url: string;
}

/**
 * Event context available in templates
 */
export interface EventContext {
  name: string;
  action: string;
}

/**
 * Label context (only present for labeled events)
 */
export interface LabelContext {
  name: string;
}

/**
 * Complete Handlebars context for template evaluation
 */
export interface HandlebarsContext {
  pr: PRContext;
  event: EventContext;
  label?: LabelContext;
  comments?: string; // All PR comments concatenated (if fetched)
  userMappings?: Record<string, string>; // GitHub username → Asana user GID mapping
}

/**
 * Task result for comment template evaluation
 */
export interface TaskResult {
  gid: string;
  name: string;
  url: string;
  success: boolean;
}

/**
 * Comment context for post-execution PR comment templates
 * Includes task results and update summary
 */
export interface CommentContext {
  pr: PRContext;
  event: EventContext;
  comments?: string;
  tasks: TaskResult[];
  updates: {
    fields: Array<{ gid: string; value: string }>;
    mark_complete: boolean;
  };
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}
