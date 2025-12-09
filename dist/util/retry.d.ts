/**
 * Retry utility with exponential backoff for API calls
 */
/**
 * Retry an async operation with exponential backoff
 *
 * @param operation - The async operation to retry
 * @param operationName - Name of the operation for logging
 * @returns Promise resolving to the operation result
 * @throws Re-throws the error after max attempts exhausted
 */
export declare function withRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T>;
//# sourceMappingURL=retry.d.ts.map