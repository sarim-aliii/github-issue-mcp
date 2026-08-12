import {
  McpServer,
} from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  z,
} from "zod";

import {
  listGitHubIssues,
} from "../github/issues.js";


export function registerListIssuesTool(
  server: McpServer
) {
  server.tool(
    "list_github_issues",

    "List open issues in a GitHub repository",

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
    },

    async ({
      owner,
      repo,
    }) => {
      try {
        const issues =
          await listGitHubIssues(
            owner,
            repo
          );

        return {
          content: [
            {
              type: "text",

              text: JSON.stringify(
                issues,
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

              text:
                error instanceof Error
                  ? error.message
                  : String(error),
            },
          ],

          isError: true,
        };
      }
    }
  );
}