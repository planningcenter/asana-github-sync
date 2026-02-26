/**
 * GitHub API utilities
 */

import * as core from "@actions/core"
import * as github from "@actions/github"
import type { HandlebarsContext, CommentContext } from "../expression/context"

/**
 * Fetch all comments for a pull request
 *
 * @param githubToken - GitHub authentication token
 * @param prNumber - Pull request number
 * @returns Concatenated comment bodies, or empty string on error
 */
export async function fetchPRComments(githubToken: string, prNumber: number): Promise<string> {
  try {
    const octokit = github.getOctokit(githubToken)
    const { owner, repo } = github.context.repo

    const commentsResponse = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
      per_page: 100,
    })

    const comments = commentsResponse.data.map((c) => c.body || "").join("\n")
    core.debug(`✓ Fetched ${commentsResponse.data.length} comment(s) for PR #${prNumber}`)

    return comments
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    core.warning(`Failed to fetch comments for PR #${prNumber}: ${errorMessage}`)
    return "" // Return empty string on error, don't block workflow
  }
}

/**
 * Post a comment to a pull request
 *
 * @param githubToken - GitHub authentication token
 * @param prNumber - Pull request number
 * @param body - Comment body (markdown supported)
 * @param dryRun - If true, log actions without executing them
 */
export async function postPRComment(
  githubToken: string,
  prNumber: number,
  body: string,
  dryRun = false
): Promise<void> {
  if (dryRun) {
    core.info(`[DRY RUN] Would post comment to PR #${prNumber}:`)
    core.info(`[DRY RUN] ${body.substring(0, 200)}${body.length > 200 ? "..." : ""}`)
  } else {
    try {
      const octokit = github.getOctokit(githubToken)
      const { owner, repo } = github.context.repo

      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      })

      core.info(`✓ Posted comment to PR #${prNumber}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      // Don't fail workflow, just log error
      core.error(`Failed to post comment to PR #${prNumber}: ${errorMessage}`)
    }
  }
}

/**
 * Evaluate and post multiple comment templates to a PR with deduplication
 *
 * @param commentTemplates - Array of Handlebars templates
 * @param githubToken - GitHub authentication token
 * @param prNumber - Pull request number
 * @param commentContext - Context object for template evaluation
 * @param evaluateTemplate - Template evaluation function
 * @param dryRun - If true, log actions without executing them
 */
export async function postCommentTemplates(
  commentTemplates: string[],
  githubToken: string,
  prNumber: number,
  commentContext: CommentContext,
  evaluateTemplate: (template: string, context: HandlebarsContext | CommentContext) => string,
  dryRun = false
): Promise<void> {
  if (commentTemplates.length === 0) {
    return
  }

  core.info("")
  core.info("Posting PR comments...")

  // Fetch existing comments once for deduplication (skip in dry-run)
  let existingBodies: Set<string>
  if (dryRun) {
    existingBodies = new Set()
  } else {
    const octokit = github.getOctokit(githubToken)
    const { owner, repo } = github.context.repo

    try {
      const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
      })
      existingBodies = new Set(comments.map((c) => c.body || "").filter((b) => b !== ""))
      core.debug(`Fetched ${comments.length} existing comments for deduplication`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      core.warning(`Failed to fetch comments for deduplication: ${errorMessage}`)
      existingBodies = new Set()
    }
  }

  for (const [index, template] of commentTemplates.entries()) {
    try {
      const commentBody = evaluateTemplate(template, commentContext)

      // Skip empty comments - usually means conditional logic evaluated to false
      // NOTE: Whitespace is preserved. Only exactly '' (empty string) is skipped.
      // TODO(docs): Document this behavior - empty comment templates are skipped
      if (commentBody === "") {
        core.info(`✓ Comment ${index + 1} of ${commentTemplates.length} skipped (empty result)`)
        continue
      }

      // Check for duplicate comment
      if (existingBodies.has(commentBody)) {
        core.debug(`✓ Comment ${index + 1} of ${commentTemplates.length} skipped (already exists)`)
        continue
      }

      await postPRComment(githubToken, prNumber, commentBody, dryRun)
      existingBodies.add(commentBody) // Track what we posted for subsequent templates
      if (!dryRun) {
        core.info(`✓ Posted comment ${index + 1} of ${commentTemplates.length}`)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      core.error(`Failed to process comment template ${index + 1}: ${errorMessage}`)
      // Continue with other comments
    }
  }
}

/**
 * Append Asana task link to issue body
 *
 * @param githubToken - GitHub authentication token
 * @param issueNumber - Issue number
 * @param taskName - Name of created task
 * @param taskUrl - URL of created task
 * @param dryRun - If true, log actions without executing them
 */
export async function appendAsanaLinkToIssue(
  githubToken: string,
  issueNumber: number,
  taskName: string,
  taskUrl: string,
  dryRun = false
): Promise<void> {
  if (dryRun) {
    core.info(`[DRY RUN] Would append Asana link to issue #${issueNumber}:`)
    core.info(`[DRY RUN]   - Task: ${taskName}`)
    core.info(`[DRY RUN]   - URL: ${taskUrl}`)
  } else {
    try {
      const octokit = github.getOctokit(githubToken)
      const { owner, repo } = github.context.repo

      const { data: issue } = await octokit.rest.issues.get({
        owner,
        repo,
        issue_number: issueNumber,
      })

      const currentBody = issue.body || ""
      const newBody = `${currentBody}\n\n---\n\nAsana task: [${taskName}](${taskUrl})`

      await octokit.rest.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        body: newBody,
      })

      core.info(`✓ Added Asana link to issue #${issueNumber}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      core.error(`Failed to update issue body: ${errorMessage}`)
    }
  }
}

/**
 * Append Asana task link to PR body
 *
 * @param githubToken - GitHub authentication token
 * @param prNumber - Pull request number
 * @param taskName - Name of created task
 * @param taskUrl - URL of created task
 * @param dryRun - If true, log actions without executing them
 */
export async function appendAsanaLinkToPR(
  githubToken: string,
  prNumber: number,
  taskName: string,
  taskUrl: string,
  dryRun = false
): Promise<void> {
  if (dryRun) {
    core.info(`[DRY RUN] Would append Asana link to PR #${prNumber}:`)
    core.info(`[DRY RUN]   - Task: ${taskName}`)
    core.info(`[DRY RUN]   - URL: ${taskUrl}`)
  } else {
    try {
      const octokit = github.getOctokit(githubToken)
      const { owner, repo } = github.context.repo

      // Fetch current PR data
      const { data: pr } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      })

      const currentBody = pr.body || ""

      // Append Asana link
      const newBody = `${currentBody}\n\n---\n\nAsana task: [${taskName}](${taskUrl})`

      await octokit.rest.pulls.update({
        owner,
        repo,
        pull_number: prNumber,
        body: newBody,
      })

      core.info(`✓ Added Asana link to PR #${prNumber}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      core.error(`Failed to update PR body: ${errorMessage}`)
      // Don't throw - this is not critical enough to fail the workflow
    }
  }
}
