/**
 * Configuration management for action inputs
 */

import * as core from '@actions/core';
import * as yaml from 'js-yaml';
import type { RulesConfig } from '../rules/types';

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
  dryRun: boolean;
} {
  const asanaToken = core.getInput('asana_token', { required: true });
  const githubToken = core.getInput('github_token', { required: true });
  const rulesYaml = core.getInput('rules', { required: true });

  // Parse dry_run input (defaults to false if not provided)
  let dryRun = false;
  const dryRunInput = core.getInput('dry_run');
  if (dryRunInput) {
    dryRun = core.getBooleanInput('dry_run');
  }

  // Parse optional user mappings (YAML or JSON string)
  const userMappingsInput = core.getInput('user_mappings');
  let userMappings: Record<string, string> = {};

  if (userMappingsInput) {
    try {
      // Try YAML first (supports both YAML and JSON since JSON is valid YAML)
      const parsed = yaml.load(userMappingsInput);
      if (isStringRecord(parsed)) {
        userMappings = parsed;
        core.info(`✓ Loaded ${Object.keys(userMappings).length} user mapping(s)`);
      } else {
        throw new Error('user_mappings must be an object/map with string values');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid user_mappings YAML: ${errorMessage}`);
    }
  }

  // Get optional integration secret
  const integrationSecret = core.getInput('integration_secret') || undefined;
  if (integrationSecret) {
    core.info(`✓ Integration secret provided`);
  }

  const parsed = parseRulesYAML(rulesYaml);

  if (dryRun) {
    core.info('🔍 DRY RUN MODE ENABLED - No changes will be made');
  }

  return {
    asanaToken,
    githubToken,
    rules: parsed,
    userMappings,
    integrationSecret,
    dryRun,
  };
}

/**
 * Type guard to check if value is a Record<string, string>
 */
function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every(val => typeof val === 'string');
}

/**
 * Type guard to check if value is a RulesConfig
 */
function isRulesConfig(value: unknown): value is RulesConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  return 'rules' in value && Array.isArray(value.rules);
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
    if (!isRulesConfig(parsed)) {
      throw new Error('Invalid rules configuration structure');
    }
    return parsed;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid YAML: ${errorMessage}`);
  }
}
