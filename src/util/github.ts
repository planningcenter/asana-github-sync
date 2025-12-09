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
