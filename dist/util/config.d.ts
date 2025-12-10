/**
 * Configuration management for action inputs
 */
import { RulesConfig } from '../rules/types';
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
    userMappings: Record<string, string>;
    integrationSecret: string | undefined;
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