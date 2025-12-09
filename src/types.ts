/**
 * Core type definitions for Asana-GitHub Sync Action
 */

/**
 * Asana custom field enum option
 */
export interface AsanaEnumOption {
  gid: string;
  name: string;
  enabled: boolean;
  color?: string;
}

/**
 * Asana custom field definition
 */
export interface AsanaCustomField {
  gid: string;
  name: string;
  resource_type: string;
  type: string;
  enum_options?: AsanaEnumOption[];
}

/**
 * Asana task (partial - only fields we use)
 */
export interface AsanaTask {
  gid: string;
  name: string;
  completed: boolean;
  custom_fields?: Record<string, any>;
}