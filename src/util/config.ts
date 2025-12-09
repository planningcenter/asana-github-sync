/**
 * Configuration management for action inputs
 */

import * as core from '@actions/core';
import { ActionConfig } from '../types';

/**
 * Read and validate action inputs from GitHub Actions context (MVP)
 * Applies default values for optional inputs
 */
export function readConfig(): ActionConfig {
  // Required inputs
  const asanaToken = core.getInput('asana_token', { required: true });
  const githubToken = core.getInput('github_token', { required: true });
  const customFieldGid = core.getInput('custom_field_gid', { required: true });

  // Optional inputs with defaults
  const stateOnOpened = core.getInput('state_on_opened') || 'In Review';
  const stateOnMerged = core.getInput('state_on_merged') || 'Shipped';

  // Boolean inputs (default to true if not specified)
  const markCompleteOnMerge = core.getBooleanInput('mark_complete_on_merge') !== false;

  return {
    asanaToken,
    githubToken,
    customFieldGid,
    stateOnOpened,
    stateOnMerged,
    markCompleteOnMerge,
  };
}
