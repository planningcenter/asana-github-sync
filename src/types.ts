/**
 * Core type definitions for Asana-GitHub Sync Action
 */

/**
 * Types of state transitions supported
 */
export enum TransitionType {
  ON_OPENED = 'ON_OPENED',
  ON_MERGED = 'ON_MERGED',
}

/**
 * Configuration for the GitHub Action (MVP)
 * Represents all inputs from action.yml
 */
export interface ActionConfig {
  // Required inputs
  asanaToken: string;
  githubToken: string;
  customFieldGid: string;

  // State mapping (with defaults)
  stateOnOpened: string;
  stateOnMerged: string;

  // Behavior flags
  markCompleteOnMerge: boolean;
}

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