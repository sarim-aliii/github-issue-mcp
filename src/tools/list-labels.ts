import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { listGitHubLabels } from "../github/issues.js";

export function registerListLabelsTool(
  server: McpServer
) {
  server.tool(
    "list_github_labels",
    "List labels available in a GitHub repository",
    {
      owner: z
        .string()
        .min(1)
        .describe("GitHub repository owner"),

      repo: z
        .string()
        .min(1)
        .describe("GitHub repository name"),
    },

    async ({ owner, repo }) => {
      try {
        const labels =
          await listGitHubLabels(
            owner,
            repo
          );

        const simplifiedLabels =
          labels.map((label) => ({
            name: label.name,
            description:
              label.description,
            color: label.color,
          }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                simplifiedLabels,
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
              text: `Failed to list GitHub labels: ${
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