/**
 * Core type definitions for Asana-GitHub Sync Action
 */
/**
 * Configuration for the GitHub Action (MVP)
 * Represents all inputs from action.yml
 */
export interface ActionConfig {
    asanaToken: string;
    githubToken: string;
    customFieldGid: string;
    stateOnOpened: string;
    stateOnMerged: string;
}
