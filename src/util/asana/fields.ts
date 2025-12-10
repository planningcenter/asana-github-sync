/**
 * Custom field operations - schema fetching, caching, and value coercion
 */

import * as core from '@actions/core';
import type { AsanaCustomField, AsanaEnumOption } from '../../types';
import { withRetry } from '../retry';
import { asanaRequest } from './client';

/**
 * Module-level cache for custom field schemas
 * Persists for the lifetime of the action run to avoid redundant API calls
 * when updating multiple tasks with the same fields
 */
const fieldSchemaCache = new Map<string, AsanaCustomField>();

/**
 * Clear the field schema cache (primarily for testing)
 */
export function clearFieldSchemaCache(): void {
  fieldSchemaCache.clear();
}

/**
 * Fetch custom field definition from Asana
 *
 * @param token - Asana Personal Access Token
 * @param customFieldGid - Custom field GID
 * @returns Custom field definition
 */
export async function fetchCustomField(token: string, customFieldGid: string) {
  core.info(`Fetching custom field ${customFieldGid}...`);
  return await withRetry(
    () => asanaRequest<AsanaCustomField>(token, `/custom_fields/${customFieldGid}`),
    `fetch custom field ${customFieldGid}`
  );
}

/**
 * Get custom field schema from cache or fetch if not cached
 *
 * @param token - Asana Personal Access Token
 * @param fieldGid - Custom field GID
 * @returns Custom field schema
 */
export async function getFieldSchema(token: string, fieldGid: string): Promise<AsanaCustomField> {
  let schema = fieldSchemaCache.get(fieldGid);
  if (!schema) {
    schema = await fetchCustomField(token, fieldGid);
    fieldSchemaCache.set(fieldGid, schema);
  }
  return schema;
}

/**
 * Find enum option matching the target state name
 *
 * @param customField - Custom field definition
 * @param stateName - Target state name to find
 * @param customFieldGid - Custom field GID for error messages
 * @returns Enum option GID, or null if not found
 */
function findEnumOption(customField: AsanaCustomField, stateName: string, customFieldGid: string): string | null {
  const enumOptions = customField.enum_options || [];

  if (enumOptions.length === 0) {
    core.error(
      `Custom field ${customFieldGid} has no enum options. It may not be an enum field (type: ${customField.type}).`
    );
    return null;
  }

  const matchingOption: AsanaEnumOption | undefined = enumOptions.find((opt) => opt.name === stateName);

  if (!matchingOption) {
    core.error(
      `State "${stateName}" not found in custom field ${customFieldGid}. ` +
        `Available options: ${enumOptions.map((o) => o.name).join(', ')}`
    );
    return null;
  }

  return matchingOption.gid;
}

/**
 * Coerce a raw string value to the appropriate type for an Asana custom field
 * Returns null if the value is invalid for the field type
 *
 * @param schema - The custom field schema from Asana
 * @param rawValue - The raw string value from template evaluation
 * @param fieldGid - The field GID (for error messages)
 * @returns The coerced value, or null if validation fails
 */
export function coerceFieldValue(
  schema: AsanaCustomField,
  rawValue: string,
  fieldGid: string
): string | number | null {
  switch (schema.type) {
    case 'enum':
      // Find matching enum option
      const enumGid = findEnumOption(schema, rawValue, fieldGid);
      if (!enumGid) {
        core.error(`Cannot update field ${fieldGid}: enum option "${rawValue}" not found`);
        return null;
      }
      return enumGid;

    case 'text':
    case 'multi_line_text':
      // Text fields: use string as-is
      return rawValue;

    case 'number':
      // Number fields: parse and validate
      const numberValue = Number(rawValue);
      if (isNaN(numberValue)) {
        core.error(`Cannot update field ${fieldGid}: "${rawValue}" is not a valid number`);
        return null;
      }
      return numberValue;

    case 'date':
      // Date fields: validate ISO 8601 format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
        core.error(`Cannot update field ${fieldGid}: "${rawValue}" must be YYYY-MM-DD format`);
        return null;
      }
      // Validate it's an actual valid date (check if parsing changes the value)
      const dateObj = new Date(rawValue);
      if (isNaN(dateObj.getTime())) {
        core.error(`Cannot update field ${fieldGid}: "${rawValue}" is not a valid date`);
        return null;
      }
      const roundTrip = dateObj.toISOString().split('T')[0];
      if (roundTrip !== rawValue) {
        core.error(`Cannot update field ${fieldGid}: "${rawValue}" is not a valid date`);
        return null;
      }
      return rawValue;

    default:
      core.warning(`Field ${fieldGid} has unsupported type '${schema.type}'. Skipping.`);
      return null;
  }
}
