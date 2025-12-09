/**
 * Configuration management for action inputs
 */
import { ActionConfig } from '../types';
import { RulesConfig } from '../rules/types';
/**
 * Read and validate action inputs from GitHub Actions context (MVP)
 * Applies default values for optional inputs
 */
export declare function readConfig(): ActionConfig;
/**
 * Read rules input (for v2.0 rules engine)
 *
 * @returns Parsed rules configuration
 * @throws Error if rules input is missing or invalid YAML
 */
export declare function readRulesConfig(): {
    asanaToken: string;
    githubToken: string;
    rules: RulesConfig;
};
/**
 * Parse rules YAML string
 *
 * @param yamlStr - YAML string containing rules
 * @returns Parsed rules configuration
 * @throws Error if YAML is invalid
 */
export declare function parseRulesYAML(yamlStr: string): RulesConfig;
//# sourceMappingURL=config.d.ts.map