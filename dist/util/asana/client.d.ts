/**
 * Base Asana API client
 */
export declare const ASANA_API_BASE = "https://app.asana.com/api/1.0";
/**
 * Make an authenticated request to the Asana API
 *
 * @param token - Asana Personal Access Token
 * @param endpoint - API endpoint path (e.g., '/custom_fields/123')
 * @param options - Fetch options (method, body, etc.)
 * @returns Parsed JSON response
 */
export declare function asanaRequest<T = unknown>(token: string, endpoint: string, options?: RequestInit): Promise<T>;
//# sourceMappingURL=client.d.ts.map