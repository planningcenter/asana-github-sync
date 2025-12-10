/**
 * Base Asana API client
 */

import { ApiError } from '../errors';

export const ASANA_API_BASE = 'https://app.asana.com/api/1.0';

/**
 * Make an authenticated request to the Asana API
 *
 * @param token - Asana Personal Access Token
 * @param endpoint - API endpoint path (e.g., '/custom_fields/123')
 * @param options - Fetch options (method, body, etc.)
 * @returns Parsed JSON response
 */
export async function asanaRequest<T = unknown>(token: string, endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${ASANA_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new ApiError(
      `Asana API error: ${response.status} ${response.statusText}`,
      response.status,
      errorBody
    );
  }

  const json = (await response.json()) as { data: T };
  return json.data;
}
