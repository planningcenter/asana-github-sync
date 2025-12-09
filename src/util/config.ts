/**
 * Configuration management for action inputs
 */

import * as core from '@actions/core';
import * as yaml from 'js-yaml';
import { RulesConfig } from '../rules/types';

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
