/**
 * Handlebars template evaluator
 * Thin wrapper around Handlebars.compile() with error handling
 */

import * as core from '@actions/core';
import Handlebars from 'handlebars';
import type { HandlebarsContext, CommentContext } from './context';

/**
 * Evaluate a Handlebars template with given context
 *
 * @param template - Handlebars template string (e.g., "Build-{{pr.number}}")
 * @param context - Context object with PR/event data
 * @returns Evaluated string, or empty string if evaluation fails
 */
export function evaluateTemplate(template: string, context: HandlebarsContext | CommentContext): string {
  try {
    const compiled = Handlebars.compile(template, {
      noEscape: true,
      strict: false,
    });

    return compiled(context);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.error(`Template evaluation failed: ${errorMessage}`);
    core.debug(`Template: ${template}`);
    core.debug(`Context: ${JSON.stringify(context, null, 2)}`);

    return '';
  }
}
