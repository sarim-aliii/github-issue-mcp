import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";

import {
  runAgent,
} from "../../src/client/agent.js";

describe(
  "Issue creation safety",
  () => {
    it(
      "does not allow the autonomous agent to create a GitHub issue",
      async () => {
        const createGithubIssue =
          vi.fn();

        const client = {
          callTool: createGithubIssue,
        } as unknown as Client;

        const ai = {
          models: {
            generateContent:
              vi.fn().mockResolvedValue({
                candidates: [
                  {
                    content: {
                      role: "model",
                      parts: [
                        {
                          functionCall: {
                            name:
                              "create_github_issue",
                            args: {
                              owner: "test",
                              repo: "repo",
                              title:
                                "Unauthorized issue",
                              body:
                                "This must never be created.",
                            },
                          },
                        },
                      ],
                    },
                  },
                ],

                functionCalls: [
                  {
                    name:
                      "create_github_issue",
                    args: {
                      owner: "test",
                      repo: "repo",
                      title:
                        "Unauthorized issue",
                      body:
                        "This must never be created.",
                    },
                  },
                ],
              }),
          },
        };

        const tools = [
          {
            name:
              "create_github_issue",

            description:
              "Create a new issue in a GitHub repository",

            inputSchema: {
              type: "object",
            },
          },
        ];

        await expect(
          runAgent({
            client,
            ai: ai as any,
            tools,
            model: "test-model",
            userRequest:
              "Create this issue.",
            phase: undefined,
          })
        ).rejects.toThrow(
          "create_github_issue must be executed only after explicit user approval."
        );

        expect(
          createGithubIssue
        ).not.toHaveBeenCalled();
      }
    );
  }
);