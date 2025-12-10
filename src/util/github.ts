/**
 * GitHub API utilities
 */

import * as core from '@actions/core';
import * as github from '@actions/github';

/**
 * Fetch all comments for a pull request
 *
 * @param githubToken - GitHub authentication token
 * @param prNumber - Pull request number
 * @returns Concatenated comment bodies, or empty string on error
 */
export async function fetchPRComments(githubToken: string, prNumber: number): Promise<string> {
  try {
    const octokit = github.getOctokit(githubToken);
    const { owner, repo } = github.context.repo;

    const commentsResponse = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
      per_page: 100,
    });

    const comments = commentsResponse.data.map(c => c.body || '').join('\n');
    core.info(`✓ Fetched ${commentsResponse.data.length} comment(s) for PR #${prNumber}`);

    return comments;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.warning(`Failed to fetch comments for PR #${prNumber}: ${errorMessage}`);
    return ''; // Return empty string on error, don't block workflow
  }
}

/**
 * Post a comment to a pull request
 *
 * @param githubToken - GitHub authentication token
 * @param prNumber - Pull request number
 * @param body - Comment body (markdown supported)
 */
export async function postPRComment(
  githubToken: string,
  prNumber: number,
  body: string
): Promise<void> {
  try {
    const octokit = github.getOctokit(githubToken);
    const { owner, repo } = github.context.repo;

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body,
    });

    core.info(`✓ Posted comment to PR #${prNumber}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Don't fail workflow, just log error
    core.error(`Failed to post comment to PR #${prNumber}: ${errorMessage}`);
  }
}

/**
 * Evaluate and post multiple comment templates to a PR
 *
 * @param commentTemplates - Array of Handlebars templates
 * @param githubToken - GitHub authentication token
 * @param prNumber - Pull request number
 * @param commentContext - Context object for template evaluation
 * @param evaluateTemplate - Template evaluation function
 */
export async function postCommentTemplates(
  commentTemplates: string[],
  githubToken: string,
  prNumber: number,
  commentContext: any,
  evaluateTemplate: (template: string, context: any) => string
): Promise<void> {
  if (commentTemplates.length === 0) {
    return;
  }

  core.info('');
  core.info('Posting PR comments...');

  for (const [index, template] of commentTemplates.entries()) {
    try {
      const commentBody = evaluateTemplate(template, commentContext);
      await postPRComment(githubToken, prNumber, commentBody);
      core.info(`✓ Posted comment ${index + 1} of ${commentTemplates.length}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      core.error(`Failed to process comment template ${index + 1}: ${errorMessage}`);
      // Continue with other comments
    }
  }
}
