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
export function readRulesConfig(): {
  asanaToken: string;
  githubToken: string;
  rules: RulesConfig;
  userMappings: Record<string, string>;
  integrationSecret: string | undefined;
} {
  const asanaToken = core.getInput('asana_token', { required: true });
  const githubToken = core.getInput('github_token', { required: true });
  const rulesYaml = core.getInput('rules', { required: true });

  // Parse optional user mappings (JSON string)
  const userMappingsInput = core.getInput('user_mappings');
  let userMappings: Record<string, string> = {};

  if (userMappingsInput) {
    try {
      userMappings = JSON.parse(userMappingsInput);
      core.info(`✓ Loaded ${Object.keys(userMappings).length} user mapping(s)`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid user_mappings JSON: ${errorMessage}`);
    }
  }

  // Get optional integration secret
  const integrationSecret = core.getInput('integration_secret') || undefined;
  if (integrationSecret) {
    core.info(`✓ Integration secret provided`);
  }

  const parsed = parseRulesYAML(rulesYaml);

  return {
    asanaToken,
    githubToken,
    rules: parsed,
    userMappings,
    integrationSecret,
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
