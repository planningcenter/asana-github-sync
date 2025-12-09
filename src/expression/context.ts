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
}
