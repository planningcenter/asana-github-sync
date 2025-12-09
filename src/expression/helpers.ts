/**
 * Handlebars helpers for regex extraction
 * Provides extract_from_body, extract_from_title, extract_from_comments
 */

import * as core from '@actions/core';
import Handlebars from 'handlebars';
import { HandlebarsContext } from './context';

/**
 * Shared extraction logic
 * Applies regex pattern to text and returns first capture group
 *
 * @param pattern - Regular expression pattern (must have a capture group)
 * @param text - Text to search in
 * @returns First capture group value, or empty string if no match
 */
function extractFromText(pattern: string, text: string): string {
  try {
    const regex = new RegExp(pattern);
    const match = regex.exec(text);

    if (!match) {
      return '';
    }

    // Return first capture group (match[1]) if it exists, otherwise full match (match[0])
    return match[1] !== undefined ? match[1] : match[0];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.error(`Invalid regex pattern "${pattern}": ${errorMessage}`);
    return '';
  }
}

/**
 * Register all Handlebars helpers
 * Call this once at startup before evaluating templates
 */
export function registerHelpers(): void {
  // Helper: Extract from PR body
  Handlebars.registerHelper('extract_from_body', function (this: HandlebarsContext, pattern: string) {
    const body = this.pr?.body || '';
    return extractFromText(pattern, body);
  });

  // Helper: Extract from PR title
  Handlebars.registerHelper('extract_from_title', function (this: HandlebarsContext, pattern: string) {
    const title = this.pr?.title || '';
    return extractFromText(pattern, title);
  });

  // Helper: Extract from PR comments
  // Requires comments to be pre-fetched and added to context
  Handlebars.registerHelper('extract_from_comments', function (this: HandlebarsContext, pattern: string) {
    const comments = this.comments || '';
    return extractFromText(pattern, comments);
  });

  core.debug('Handlebars extraction helpers registered');
}
