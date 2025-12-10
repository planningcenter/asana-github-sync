/**
 * Tests for configuration management
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { parseRulesYAML } from '../../src/util/config';

describe('parseRulesYAML', () => {
  test('parses valid rules YAML', () => {
    const yaml = `
rules:
  - when:
      - pr.opened
    actions:
      - type: create_task
        project: "1234567890"
        workspace: "9876543210"
        title: "PR: {{pr.title}}"
`;
    const result = parseRulesYAML(yaml);
    expect(result).toBeDefined();
    expect(result.rules).toBeArrayOfSize(1);
    expect(result.rules[0].when).toEqual(['pr.opened']);
    expect(result.rules[0].actions).toBeArrayOfSize(1);
  });

  test('parses rules with multiple actions', () => {
    const yaml = `
rules:
  - when:
      - pr.opened
    actions:
      - type: create_task
        project: "1234567890"
        workspace: "9876543210"
        title: "PR: {{pr.title}}"
      - type: update_tasks
        fields:
          "1111111111": "In Progress"
`;
    const result = parseRulesYAML(yaml);
    expect(result.rules[0].actions).toBeArrayOfSize(2);
  });

  test('throws error on invalid YAML syntax', () => {
    const invalidYaml = `
rules:
  - when:
      - pr.opened
    actions: [invalid yaml structure
`;
    expect(() => parseRulesYAML(invalidYaml)).toThrow('Invalid YAML');
  });

  test('throws error when missing rules key', () => {
    const yaml = `
config:
  - something: else
`;
    expect(() => parseRulesYAML(yaml)).toThrow('Invalid rules configuration structure');
  });

  test('throws error when rules is not an array', () => {
    const yaml = `
rules: "not an array"
`;
    expect(() => parseRulesYAML(yaml)).toThrow('Invalid rules configuration structure');
  });

  test('throws error on empty string', () => {
    expect(() => parseRulesYAML('')).toThrow();
  });

  test('handles complex nested structures', () => {
    const yaml = `
rules:
  - when:
      - pr.opened
      - pr.synchronize
    actions:
      - type: create_task
        project: "1234567890"
        workspace: "9876543210"
        title: "PR: {{pr.title}}"
        notes: "Description: {{pr.body}}"
        assignee: "{{pr.user.login}}"
        initial_fields:
          "field-1": "value-1"
          "field-2": "value-2"
`;
    const result = parseRulesYAML(yaml);
    expect(result.rules[0].when).toBeArrayOfSize(2);
    expect(result.rules[0].actions[0].initial_fields).toBeDefined();
  });

  test('throws error for non-string values', () => {
    // This tests the error handling in yaml.load
    const yaml = null as any;
    expect(() => parseRulesYAML(yaml)).toThrow();
  });
});
