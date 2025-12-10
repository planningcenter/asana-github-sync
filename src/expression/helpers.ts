/**
 * Handlebars helpers for regex extraction
 * Provides extract_from_body, extract_from_title, extract_from_comments
 */

import * as core from '@actions/core';
import Handlebars from 'handlebars';
import type { HandlebarsContext } from './context';

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

  // Helper: Clean conventional commit prefixes from title
  Handlebars.registerHelper('clean_title', function (title: string) {
    if (!title) return '';

    // Remove conventional commit prefixes:
    // feat: fix: chore: docs: style: refactor: perf: test:
    // feat(scope): chore(api): etc.
    return title.replace(/^(feat|fix|chore|docs|style|refactor|perf|test)(\([^)]+\))?:\s*/, '');
  });

  // Helper: Sanitize markdown for Asana notes (comprehensive version)
  Handlebars.registerHelper('sanitize_markdown', function (text: string) {
    if (!text) return '';

    return (
      text
        // Remove markdown images - both linked and standalone
        .replace(/\[!\[([^\]]*)\]\([^)]+(?:\s+"[^"]*")?\)\]\(([^)]+)\)/g, '') // Linked images
        .replace(/!\[[^\]]*\]\([^)]+(?:\s+"[^"]*")?\)/g, '') // Standalone images
        // Remove HTML-style markdown comments
        .replace(/\[\/\/\]: # \([^)]*\)/g, '')
        // Remove <details> tags and content
        .replace(/<details[^>]*>[\s\S]*?<\/details>/gi, '')
        // Convert <br> to newlines
        .replace(/<br\s*\/?>/gi, '\n')
        // Normalize line endings
        .replace(/\r\n/g, '\n') // Windows to Unix
        .replace(/\r/g, '\n') // Mac to Unix
        // Collapse whitespace
        .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
        .replace(/\n[ \t]*/g, '\n') // Remove spaces after newlines
        .replace(/[ \t]*\n/g, '\n') // Remove spaces before newlines
        .replace(/\n{3,}/g, '\n\n') // Collapse 3+ newlines to 2
        .trim()
    );
  });

  // Helper: Map GitHub username to Asana user GID
  Handlebars.registerHelper('map_github_to_asana', function (this: HandlebarsContext, githubUsername: string) {
    const mappings = this.userMappings || {};
    return mappings[githubUsername] || ''; // Empty string if not found
  });

  // Helper: Logical OR - returns first truthy value
  Handlebars.registerHelper('or', function (...args: unknown[]) {
    // Handlebars passes options as last argument, so exclude it
    const values = args.slice(0, -1);

    for (const value of values) {
      if (value) return value;
    }
    return '';
  });

  core.debug('Handlebars helpers registered');
}
