/**
 * Handlebars template evaluator
 * Thin wrapper around Handlebars.compile() with error handling
 */
import type { HandlebarsContext, CommentContext } from './context';
/**
 * Evaluate a Handlebars template with given context
 *
 * @param template - Handlebars template string (e.g., "Build-{{pr.number}}")
 * @param context - Context object with PR/event data
 * @returns Evaluated string, or empty string if evaluation fails
 */
export declare function evaluateTemplate(template: string, context: HandlebarsContext | CommentContext): string;
//# sourceMappingURL=evaluator.d.ts.map