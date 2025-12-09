/**
 * Custom error types for the action
 */
/**
 * Custom error class for API errors with status code information
 */
export declare class ApiError extends Error {
    status: number;
    statusCode: number;
    body?: string;
    constructor(message: string, status: number, body?: string);
}
/**
 * Type guard to check if error is an ApiError
 */
export declare function isApiError(error: unknown): error is ApiError;
//# sourceMappingURL=errors.d.ts.map