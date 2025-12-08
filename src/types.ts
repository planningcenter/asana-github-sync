/**
 * Core type definitions for Asana-GitHub Sync Action
 */

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
}