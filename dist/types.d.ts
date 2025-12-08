/**
 * Core type definitions for Asana-GitHub Sync Action
 */
/**
 * Types of state transitions supported
 */
export declare enum TransitionType {
    ON_OPENED = "ON_OPENED",
    ON_MERGED = "ON_MERGED"
}
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
