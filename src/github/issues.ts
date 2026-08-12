import { githubRequest } from "./client.js";

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
}

interface GitHubIssueResponse {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  pull_request?: unknown;
}

export interface GitHubLabel {
  name: string;
  description: string | null;
  color: string;
}

/**
 * List all open GitHub issues.
 *
 * GitHub's /issues endpoint also returns pull requests,
 * so pull requests are explicitly filtered out.
 *
 * Pagination is supported up to MAX_PAGES pages.
 */
export async function listGitHubIssues(
  owner: string,
  repo: string
): Promise<GitHubIssue[]> {
  const allIssues: GitHubIssue[] = [];

  const perPage = 100;
  const MAX_PAGES = 10;

  let page = 1;

  while (page <= MAX_PAGES) {
    const issues =
      await githubRequest<GitHubIssueResponse[]>(
        `/repos/${owner}/${repo}/issues?state=open&per_page=${perPage}&page=${page}`
      );

    const regularIssues = issues
      .filter(
        (issue) =>
          !issue.pull_request
      )
      .map((issue) => ({
        number: issue.number,
        title: issue.title,
        body: issue.body,
        html_url: issue.html_url,
        state: issue.state,
      }));

    allIssues.push(
      ...regularIssues
    );

    /*
     * If GitHub returned fewer than 100
     * results, there are no more pages.
     */
    if (issues.length < perPage) {
      break;
    }

    page++;
  }

  return allIssues;
}

/**
 * List all labels available in a GitHub repository.
 */
export async function listGitHubLabels(
  owner: string,
  repo: string
): Promise<GitHubLabel[]> {
  return githubRequest<GitHubLabel[]>(
    `/repos/${owner}/${repo}/labels?per_page=100`
  );
}

/**
 * Create a new GitHub issue.
 *
 * Before creating the issue, requested labels
 * are validated against the repository's
 * available labels.
 */
export async function createGitHubIssue(
  owner: string,
  repo: string,
  title: string,
  body: string,
  labels: string[] = []
): Promise<GitHubIssue> {
  const validatedLabels =
    await validateGitHubLabels(
      owner,
      repo,
      labels
    );

  return githubRequest<GitHubIssue>(
    `/repos/${owner}/${repo}/issues`,
    {
      method: "POST",

      body: JSON.stringify({
        title,
        body,
        labels: validatedLabels,
      }),
    }
  );
}

/**
 * Validate that every requested label
 * exists in the GitHub repository.
 */
export async function validateGitHubLabels(
  owner: string,
  repo: string,
  requestedLabels: string[]
): Promise<string[]> {
  if (requestedLabels.length === 0) {
    return [];
  }

  const availableLabels =
    await listGitHubLabels(
      owner,
      repo
    );

  const availableLabelNames =
    new Set(
      availableLabels.map(
        (label) => label.name
      )
    );

  const invalidLabels =
    requestedLabels.filter(
      (label) =>
        !availableLabelNames.has(label)
    );

  if (invalidLabels.length > 0) {
    throw new Error(
      `Invalid GitHub label(s): ${invalidLabels.join(
        ", "
      )}. Available labels: ${[
        ...availableLabelNames,
      ].join(", ")}`
    );
  }

  return requestedLabels;
}