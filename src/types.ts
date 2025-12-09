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