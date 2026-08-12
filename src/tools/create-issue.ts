import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { createGitHubIssue } from "../github/issues.js";


export function registerCreateIssueTool(
  server: McpServer
) {
  server.tool(
    "create_github_issue",
    "Create a new issue in a GitHub repository",
    {
      owner: z
        .string()
        .min(1)
        .describe("GitHub repository owner"),

      repo: z
        .string()
        .min(1)
        .describe("GitHub repository name"),

      title: z
        .string()
        .min(1)
        .describe("Issue title"),

      body: z
        .string()
        .min(1)
        .describe("Issue body in Markdown"),

      labels: z
        .array(z.string())
        .optional()
        .describe("GitHub labels to apply"),
    },

    async ({
      owner,
      repo,
      title,
      body,
      labels,
    }) => {
      try {
        const issue =
          await createGitHubIssue(
            owner,
            repo,
            title,
            body,
            labels ?? []
          );

        return {
          content: [
            {
              type: "text",
              text: [
                "GitHub issue created successfully.",
                "",
                `Issue #${issue.number}`,
                `Title: ${issue.title}`,
                `URL: ${issue.html_url}`,
              ].join("\n"),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to create GitHub issue: ${
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