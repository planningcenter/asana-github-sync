/**
 * Retry utility with exponential backoff for API calls
 */

import * as core from "@actions/core"
import { retry } from "@lifeomic/attempt"
import { isApiError } from "./errors"

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  maxAttempts: 3,
  delay: 1000, // 1 second initial delay
  factor: 2, // 2x exponential backoff
  maxDelay: 10000, // 10 second cap
}

/**
 * Error with status code information
 */
interface ErrorWithStatus {
  status?: number
  statusCode?: number
  code?: string
  errno?: string
  response?: {
    status?: number
  }
}

/**
 * Type guard for errors with status
 */
function hasStatus(error: unknown): error is ErrorWithStatus {
  return typeof error === "object" && error !== null
}

/**
 * Determine if an error should be retried
 *
 * @param error - The error to classify
 * @returns true if the error is retryable, false otherwise
 */
function isRetryableError(error: unknown): boolean {
  // Handle our custom ApiError
  if (isApiError(error)) {
    const status = error.status
    // Retry rate limits and server errors
    if (status === 429 || status >= 500) {
      return true
    }
    // Don't retry client errors
    if (status === 400 || status === 401 || status === 403 || status === 404 || status === 409) {
      return false
    }
  }

  // Handle other error types with status codes
  if (!hasStatus(error)) {
    return false
  }

  // Check for HTTP status codes (direct or nested)
  const status = error.status || error.statusCode || error.response?.status

  if (status) {
    // Retry rate limits and server errors
    if (status === 429 || status >= 500) {
      return true
    }

    // Don't retry client errors
    if (status === 400 || status === 401 || status === 403 || status === 404 || status === 409) {
      return false
    }
  }

  // Check for network errors by error code
  const code = error?.code || error?.errno
  if (code) {
    const retryableNetworkErrors = [
      "ECONNRESET",
      "ETIMEDOUT",
      "ENOTFOUND",
      "ENETUNREACH",
      "EAI_AGAIN",
    ]
    if (retryableNetworkErrors.includes(code)) {
      return true
    }
  }

  // Default to not retrying unknown errors (fail fast)
  return false
}

/**
 * Retry an async operation with exponential backoff
 *
 * @param operation - The async operation to retry
 * @param operationName - Name of the operation for logging
 * @returns Promise resolving to the operation result
 * @throws Re-throws the error after max attempts exhausted
 */
export async function withRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
  return retry<T>(
    async (context) => {
      if (context.attemptNum > 1) {
        core.warning(
          `Retry attempt ${context.attemptNum}/${RETRY_CONFIG.maxAttempts} for ${operationName}`
        )
      }

      return await operation()
    },
    {
      delay: RETRY_CONFIG.delay,
      factor: RETRY_CONFIG.factor,
      maxDelay: RETRY_CONFIG.maxDelay,
      maxAttempts: RETRY_CONFIG.maxAttempts,
      handleError: (error, context) => {
        const shouldRetry = isRetryableError(error)

        if (shouldRetry) {
          const errorMessage = error?.message || String(error)
          core.warning(
            `Attempt ${context.attemptNum}/${RETRY_CONFIG.maxAttempts} failed for ${operationName}: ${errorMessage}`
          )
        } else {
          core.debug(`Non-retryable error for ${operationName}: ${JSON.stringify(error)}`)
          throw error
        }
      },
    }
  )
}
