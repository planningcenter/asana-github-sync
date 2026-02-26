/**
 * Handlebars helpers for regex extraction
 * Provides extract_from_body, extract_from_title, extract_from_comments
 */

import * as core from "@actions/core"
import Handlebars from "handlebars"
import { marked } from "marked"
import type { HandlebarsContext } from "./context"

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
    const regex = new RegExp(pattern)
    const match = regex.exec(text)

    if (!match) {
      return ""
    }

    // Return first capture group (match[1]) if it exists, otherwise full match (match[0])
    return match[1] !== undefined ? match[1] : match[0]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    core.error(`Invalid regex pattern "${pattern}": ${errorMessage}`)
    return ""
  }
}

/**
 * Register all Handlebars helpers
 * Call this once at startup before evaluating templates
 */
export function registerHelpers(): void {
  // Helper: Extract from body (PR or issue)
  Handlebars.registerHelper(
    "extract_from_body",
    function (this: HandlebarsContext, pattern: string) {
      const body = this.pr?.body || this.issue?.body || ""
      return extractFromText(pattern, body)
    }
  )

  // Helper: Extract from title (PR or issue)
  Handlebars.registerHelper(
    "extract_from_title",
    function (this: HandlebarsContext, pattern: string) {
      const title = this.pr?.title || this.issue?.title || ""
      return extractFromText(pattern, title)
    }
  )

  // Helper: Extract from PR comments
  // Requires comments to be pre-fetched and added to context
  Handlebars.registerHelper(
    "extract_from_comments",
    function (this: HandlebarsContext, pattern: string) {
      const comments = this.comments || ""
      return extractFromText(pattern, comments)
    }
  )

  // Helper: Clean conventional commit prefixes from title
  Handlebars.registerHelper("clean_title", function (title: string) {
    if (!title) return ""

    // Remove conventional commit prefixes:
    // feat: fix: chore: docs: style: refactor: perf: test:
    // feat(scope): chore(api): etc.
    return title.replace(/^(feat|fix|chore|docs|style|refactor|perf|test)(\([^)]+\))?:\s*/, "")
  })

  // Helper: Sanitize markdown for Asana notes (comprehensive version)
  Handlebars.registerHelper("sanitize_markdown", function (text: string) {
    if (!text) return ""

    return (
      text
        // Remove markdown images - both linked and standalone
        .replace(/\[!\[([^\]]*)\]\([^)]+(?:\s+"[^"]*")?\)\]\(([^)]+)\)/g, "") // Linked images
        .replace(/!\[[^\]]*\]\([^)]+(?:\s+"[^"]*")?\)/g, "") // Standalone images
        // Remove HTML-style markdown comments
        .replace(/\[\/\/\]: # \([^)]*\)/g, "")
        // Remove <details> tags and content
        .replace(/<details[^>]*>[\s\S]*?<\/details>/gi, "")
        // Convert <br> to newlines
        .replace(/<br\s*\/?>/gi, "\n")
        // Normalize line endings
        .replace(/\r\n/g, "\n") // Windows to Unix
        .replace(/\r/g, "\n") // Mac to Unix
        // Collapse whitespace
        .replace(/[ \t]+/g, " ") // Multiple spaces/tabs to single space
        .replace(/\n[ \t]*/g, "\n") // Remove spaces after newlines
        .replace(/[ \t]*\n/g, "\n") // Remove spaces before newlines
        .replace(/\n{3,}/g, "\n\n") // Collapse 3+ newlines to 2
        .trim()
    )
  })

  // Helper: Convert markdown to HTML for use in Asana html_notes
  Handlebars.registerHelper("markdown_to_html", function (text: string) {
    if (!text) return ""

    // Pre-process: strip content that doesn't translate well to Asana HTML
    const cleaned = text
      .replace(/\[!\[([^\]]*)\]\([^)]+(?:\s+"[^"]*")?\)\]\(([^)]+)\)/g, "") // Linked images
      .replace(/!\[[^\]]*\]\([^)]+(?:\s+"[^"]*")?\)/g, "") // Standalone images
      .replace(/\[\/\/\]: # \([^)]*\)/g, "") // HTML-style comments
      .replace(/<\/?details[^>]*>/gi, "") // Strip <details> open/close tags, keep content
      .replace(/<\/?summary[^>]*>/gi, "") // Strip <summary> open/close tags, keep text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim()

    // Convert markdown to HTML (async: false narrows return type to string)
    // Drop raw HTML blocks/inline HTML to avoid unsafe/unsupported tags and attributes
    const renderer = new marked.Renderer()
    renderer.html = () => ""
    const html = marked.parse(cleaned, { async: false, renderer })

    // Post-process: fix Asana compatibility
    const result = html
      .replace(/<img[^>]*\/?>/gi, "") // Remove img tags (Asana only supports attached images)
      .replace(/<h([3-6])([^>]*)>/gi, "<h2$2>") // Downgrade h3-h6 to h2
      .replace(/<\/h[3-6]>/gi, "</h2>") // Close tags for h3-h6
      .replace(/ class="[^"]*"/gi, "") // Strip class attributes (e.g. language-js on code)
      .replace(/<del>/gi, "<s>") // Convert <del> to <s> for Asana strikethrough
      .replace(/<\/del>/gi, "</s>")
      .replace(/<\/?thead[^>]*>/gi, "") // Strip <thead> wrapper (not in Asana's supported tags)
      .replace(/<\/?tbody[^>]*>/gi, "") // Strip <tbody> wrapper (not in Asana's supported tags)
      .replace(/<th([^>]*)>/gi, "<td$1>") // Convert <th> to <td>
      .replace(/<\/th>/gi, "</td>") // Convert </th> to </td>

    return new Handlebars.SafeString(result)
  })

  // Helper: Map GitHub username to Asana user GID
  Handlebars.registerHelper(
    "map_github_to_asana",
    function (this: HandlebarsContext, githubUsername: string) {
      const mappings = this.userMappings || {}
      return mappings[githubUsername] || "" // Empty string if not found
    }
  )

  // Helper: Logical OR - returns first truthy value
  Handlebars.registerHelper("or", function (...args: unknown[]) {
    // Handlebars passes options as last argument, so exclude it
    const values = args.slice(0, -1)

    for (const value of values) {
      if (value) return value
    }
    return ""
  })

  core.debug("Handlebars helpers registered")
}
