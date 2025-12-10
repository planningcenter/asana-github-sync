/**
 * Custom field operations - schema fetching, caching, and value coercion
 */
import { AsanaCustomField } from '../../types';
/**
 * Clear the field schema cache (primarily for testing)
 */
export declare function clearFieldSchemaCache(): void;
/**
 * Fetch custom field definition from Asana
 *
 * @param token - Asana Personal Access Token
 * @param customFieldGid - Custom field GID
 * @returns Custom field definition
 */
export declare function fetchCustomField(token: string, customFieldGid: string): Promise<AsanaCustomField>;
/**
 * Get custom field schema from cache or fetch if not cached
 *
 * @param token - Asana Personal Access Token
 * @param fieldGid - Custom field GID
 * @returns Custom field schema
 */
export declare function getFieldSchema(token: string, fieldGid: string): Promise<AsanaCustomField>;
/**
 * Coerce a raw string value to the appropriate type for an Asana custom field
 * Returns null if the value is invalid for the field type
 *
 * @param schema - The custom field schema from Asana
 * @param rawValue - The raw string value from template evaluation
 * @param fieldGid - The field GID (for error messages)
 * @returns The coerced value, or null if validation fails
 */
export declare function coerceFieldValue(schema: AsanaCustomField, rawValue: string, fieldGid: string): string | number | null;
//# sourceMappingURL=fields.d.ts.map