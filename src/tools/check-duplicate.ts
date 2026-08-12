import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { listGitHubIssues } from "../github/issues.js";


export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getWords(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(" ")
      .filter(
        (word) => word.length > 2
      )
  );
}

export function calculateSimilarity(
  first: string,
  second: string
): number {
  const firstWords =
    getWords(first);

  const secondWords =
    getWords(second);

  if (
    firstWords.size === 0 ||
    secondWords.size === 0
  ) {
    return 0;
  }

  let intersection = 0;

  for (const word of firstWords) {
    if (secondWords.has(word)) {
      intersection++;
    }
  }

  const union = new Set([
    ...firstWords,
    ...secondWords,
  ]).size;

  return intersection / union;
}


export async function checkDuplicateIssue(
  owner: string,
  repo: string,
  description: string
) {
  const issues = await listGitHubIssues(
    owner,
    repo
  );

  const matches = issues
    .map((issue) => {
      const issueText = [
        issue.title,
        issue.body ?? "",
      ].join(" ");

      const similarity =
        calculateSimilarity(
          description,
          issueText
        );

      return {
        number: issue.number,
        title: issue.title,
        body: issue.body,
        url: issue.html_url,
        similarity,
      };
    })
    .sort(
      (a, b) =>
        b.similarity - a.similarity
    )
    .slice(0, 5);

  return {
    candidates: matches,
  };
}

export function registerCheckDuplicateTool(
  server: McpServer
) {
  server.tool(
    "check_duplicate_issue",
    "Find the most likely existing open GitHub issues that could be related to a proposed issue. This tool retrieves open issues and performs cheap lexical candidate ranking. Treat the returned issues as candidates only; semantic duplicate determination must be done by the AI. Do not call list_github_issues separately for duplicate checking.",
    {
      owner: z
        .string()
        .min(1)
        .describe(
          "GitHub repository owner"
        ),

      repo: z
        .string()
        .min(1)
        .describe(
          "GitHub repository name"
        ),

      description: z
        .string()
        .min(5)
        .describe(
          "Description of the proposed issue"
        ),
    },

    async ({
      owner,
      repo,
      description,
    }) => {
      try {
        const result =
          await checkDuplicateIssue(
            owner,
            repo,
            description
          );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                result,
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to check duplicate issues: ${
                error instanceof Error
                  ? error.message
                  : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}