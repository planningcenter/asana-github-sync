/**
 * Custom error types for the action
 */

/**
 * Custom error class for API errors with status code information
 */
export class ApiError extends Error {
  status: number;
  statusCode: number;
  body?: string;

  constructor(message: string, status: number, body?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusCode = status;
    this.body = body;
  }
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
