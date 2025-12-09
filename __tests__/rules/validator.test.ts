/**
 * Tests for rules validator
 */

import { validateRulesConfig } from '../../src/rules/validator';
import { RulesConfig } from '../../src/rules/types';

describe('validateRulesConfig', () => {
  test('validates valid config', () => {
    const config: RulesConfig = {
      rules: [
        {
          when: { event: 'pull_request', action: 'opened' },
          then: { update_fields: { '1234': 'In Review' } },
        },
      ],
    };

    expect(() => validateRulesConfig(config)).not.toThrow();
  });

  test('throws when rules is missing', () => {
    const config = {} as RulesConfig;
    expect(() => validateRulesConfig(config)).toThrow('rules must be an array');
  });

  test('throws when rules is not an array', () => {
    const config = { rules: 'not an array' } as unknown as RulesConfig;
    expect(() => validateRulesConfig(config)).toThrow('rules must be an array');
  });

  test('throws when rules array is empty', () => {
    const config: RulesConfig = { rules: [] };
    expect(() => validateRulesConfig(config)).toThrow('rules array cannot be empty');
  });

  test('throws when when block is missing', () => {
    const config = {
      rules: [{ then: { update_fields: { '1234': 'Value' } } }],
    } as unknown as RulesConfig;

    expect(() => validateRulesConfig(config)).toThrow("Rule 0: Missing 'when' block");
  });

  test('throws when event is missing', () => {
    const config = {
      rules: [
        {
          when: {},
          then: { update_fields: { '1234': 'Value' } },
        },
      ],
    } as unknown as RulesConfig;

    expect(() => validateRulesConfig(config)).toThrow("Rule 0: 'event' must be a string");
  });

  test('throws when event is not a string', () => {
    const config = {
      rules: [
        {
          when: { event: 123 },
          then: { update_fields: { '1234': 'Value' } },
        },
      ],
    } as unknown as RulesConfig;

    expect(() => validateRulesConfig(config)).toThrow("Rule 0: 'event' must be a string");
  });

  test('throws when action is invalid type', () => {
    const config = {
      rules: [
        {
          when: { event: 'pull_request', action: 123 },
          then: { update_fields: { '1234': 'Value' } },
        },
      ],
    } as unknown as RulesConfig;

    expect(() => validateRulesConfig(config)).toThrow("Rule 0: 'action' must be a string or array");
  });

  test('throws when action array is empty', () => {
    const config: RulesConfig = {
      rules: [
        {
          when: { event: 'pull_request', action: [] },
          then: { update_fields: { '1234': 'Value' } },
        },
      ],
    };

    expect(() => validateRulesConfig(config)).toThrow("Rule 0: 'action' array cannot be empty");
  });

  test('accepts valid action string', () => {
    const config: RulesConfig = {
      rules: [
        {
          when: { event: 'pull_request', action: 'opened' },
          then: { update_fields: { '1234': 'Value' } },
        },
      ],
    };

    expect(() => validateRulesConfig(config)).not.toThrow();
  });

  test('accepts valid action array', () => {
    const config: RulesConfig = {
      rules: [
        {
          when: { event: 'pull_request', action: ['opened', 'reopened'] },
          then: { update_fields: { '1234': 'Value' } },
        },
      ],
    };

    expect(() => validateRulesConfig(config)).not.toThrow();
  });

  test('throws when merged is not boolean', () => {
    const config = {
      rules: [
        {
          when: { event: 'pull_request', merged: 'yes' },
          then: { update_fields: { '1234': 'Value' } },
        },
      ],
    } as unknown as RulesConfig;

    expect(() => validateRulesConfig(config)).toThrow("Rule 0: 'merged' must be a boolean");
  });

  test('throws when draft is not boolean', () => {
    const config = {
      rules: [
        {
          when: { event: 'pull_request', draft: 'no' },
          then: { update_fields: { '1234': 'Value' } },
        },
      ],
    } as unknown as RulesConfig;

    expect(() => validateRulesConfig(config)).toThrow("Rule 0: 'draft' must be a boolean");
  });

  test('throws when label is not string', () => {
    const config = {
      rules: [
        {
          when: { event: 'pull_request', label: 123 },
          then: { update_fields: { '1234': 'Value' } },
        },
      ],
    } as unknown as RulesConfig;

    expect(() => validateRulesConfig(config)).toThrow("Rule 0: 'label' must be a string");
  });

  test('throws when then block is missing', () => {
    const config = {
      rules: [{ when: { event: 'pull_request' } }],
    } as unknown as RulesConfig;

    expect(() => validateRulesConfig(config)).toThrow("Rule 0: Missing 'then' block");
  });

  test('throws when update_fields is missing', () => {
    const config = {
      rules: [
        {
          when: { event: 'pull_request' },
          then: {},
        },
      ],
    } as unknown as RulesConfig;

    expect(() => validateRulesConfig(config)).toThrow("Rule 0: 'update_fields' must be an object");
  });

  test('throws when update_fields is not an object', () => {
    const config = {
      rules: [
        {
          when: { event: 'pull_request' },
          then: { update_fields: 'not an object' },
        },
      ],
    } as unknown as RulesConfig;

    expect(() => validateRulesConfig(config)).toThrow("Rule 0: 'update_fields' must be an object");
  });

  test('throws when update_fields is empty', () => {
    const config: RulesConfig = {
      rules: [
        {
          when: { event: 'pull_request' },
          then: { update_fields: {} },
        },
      ],
    };

    expect(() => validateRulesConfig(config)).toThrow("Rule 0: 'update_fields' cannot be empty");
  });

  test('throws when field GID is not numeric', () => {
    const config: RulesConfig = {
      rules: [
        {
          when: { event: 'pull_request' },
          then: { update_fields: { 'not-numeric': 'Value' } },
        },
      ],
    };

    expect(() => validateRulesConfig(config)).toThrow(
      "Rule 0: Invalid field GID 'not-numeric' (must be numeric)"
    );
  });

  test('accepts valid field GID', () => {
    const config: RulesConfig = {
      rules: [
        {
          when: { event: 'pull_request' },
          then: { update_fields: { '1234567890': 'Value' } },
        },
      ],
    };

    expect(() => validateRulesConfig(config)).not.toThrow();
  });

  test('throws when mark_complete is not boolean', () => {
    const config = {
      rules: [
        {
          when: { event: 'pull_request' },
          then: { update_fields: { '1234': 'Value' }, mark_complete: 'yes' },
        },
      ],
    } as unknown as RulesConfig;

    expect(() => validateRulesConfig(config)).toThrow("Rule 0: 'mark_complete' must be a boolean");
  });

  test('validates multiple rules', () => {
    const config: RulesConfig = {
      rules: [
        {
          when: { event: 'pull_request', action: 'opened' },
          then: { update_fields: { '1234': 'In Review' } },
        },
        {
          when: { event: 'pull_request', action: 'closed', merged: true },
          then: { update_fields: { '1234': 'Done' }, mark_complete: true },
        },
      ],
    };

    expect(() => validateRulesConfig(config)).not.toThrow();
  });

  test('reports correct rule index in error', () => {
    const config = {
      rules: [
        {
          when: { event: 'pull_request' },
          then: { update_fields: { '1234': 'Value' } },
        },
        {
          when: { event: 'pull_request' },
          then: { update_fields: {} },
        },
      ],
    } as unknown as RulesConfig;

    expect(() => validateRulesConfig(config)).toThrow("Rule 1: 'update_fields' cannot be empty");
  });
});
