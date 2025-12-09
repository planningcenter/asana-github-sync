/**
 * Configuration management for action inputs
 */

import * as core from '@actions/core';
import * as yaml from 'js-yaml';
import { ActionConfig } from '../types';
import { RulesConfig } from '../rules/types';

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

/**
 * Read rules input (for v2.0 rules engine)
 *
 * @returns Parsed rules configuration
 * @throws Error if rules input is missing or invalid YAML
 */
export function readRulesConfig(): { asanaToken: string; githubToken: string; rules: RulesConfig } {
  const asanaToken = core.getInput('asana_token', { required: true });
  const githubToken = core.getInput('github_token', { required: true });
  const rulesYaml = core.getInput('rules', { required: true });

  const parsed = parseRulesYAML(rulesYaml);

  return {
    asanaToken,
    githubToken,
    rules: parsed,
  };
}

/**
 * Parse rules YAML string
 *
 * @param yamlStr - YAML string containing rules
 * @returns Parsed rules configuration
 * @throws Error if YAML is invalid
 */
export function parseRulesYAML(yamlStr: string): RulesConfig {
  try {
    const parsed = yaml.load(yamlStr);
    return parsed as RulesConfig;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid YAML: ${errorMessage}`);
  }
}
