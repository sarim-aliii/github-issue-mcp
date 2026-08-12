import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { GoogleGenAI } from "@google/genai";

import {
  runWorkflow,
} from "../../src/client/workflow.js";

function createMockClient() {
  return {
    callTool:
      vi.fn(),
  } as unknown as Client;
}

function createMockAI() {
  return {} as GoogleGenAI;
}

function createBaseDependencies() {
  return {
    getIssueDescription:
      vi.fn(
        async () =>
          "Login button does not work"
      ),

    gatherIssueDetails:
      vi.fn(
        async (
          description: string
        ) => ({
          description,

          reproductionSteps:
            "Open login page and click Login.",

          expectedBehavior:
            "User should reach the dashboard.",

          actualBehavior:
            "Nothing happens.",

          environment:
            "Chrome 126 on Windows 11.",

          additionalContext:
            "Issue happens consistently.",
        })
      ),

    requestIssueApproval:
      vi.fn(
        async () => true
      ),

    runAgent:
      vi.fn(),

    analyzeDuplicates:
      vi.fn(),

    ai: createMockAI(),
  };
}

const tools = [
  {
    name:
      "check_duplicate_issue",

    description:
      "Find duplicate issues.",
  },

  {
    name:
      "generate_issue",

    description:
      "Generate an issue.",
  },
];

describe(
  "Issue workflow",
  () => {
    it(
      "stops when a duplicate is found",
      async () => {
        const client =
          createMockClient();

        const dependencies =
          createBaseDependencies();

        dependencies.runAgent.mockResolvedValue(
          {
            finalResponse: "",

            duplicateResult: {
              candidates: [
                {
                  number: 12,

                  title:
                    "Existing login bug",

                  body:
                    "Same problem",

                  url:
                    "https://github.com/test/repo/issues/12",

                  similarity: 0.9,
                },
              ],
            },
          }
        );

        dependencies.analyzeDuplicates.mockResolvedValue(
          {
            isDuplicate: true,

            duplicateIssue: {
              number: 12,

              title:
                "Existing login bug",

              url:
                "https://github.com/test/repo/issues/12",
            },

            reason:
              "The existing issue describes the same problem.",
          }
        );

        const result =
          await runWorkflow({
            client,

            tools,

            owner: "test",

            repo: "repo",

            model:
              "test-model",

            dependencies,
          });

        expect(result).toEqual({
          status: "duplicate",

          issue: {
            number: 12,

            title:
              "Existing login bug",

            url:
              "https://github.com/test/repo/issues/12",
          },
        });

        expect(
          dependencies.gatherIssueDetails
        ).not.toHaveBeenCalled();

        expect(
          dependencies.requestIssueApproval
        ).not.toHaveBeenCalled();

        expect(
          client.callTool
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "generates and creates an issue when no duplicate exists",
      async () => {
        const client =
          createMockClient();

        const dependencies =
          createBaseDependencies();

        dependencies.runAgent
          .mockResolvedValueOnce({
            finalResponse: "",

            duplicateResult: {
              candidates: [],
            },
          })
          .mockResolvedValueOnce({
            finalResponse: "",

            proposedIssue: {
              title:
                "Bug: Login button does not work",

              body:
                "Login button fails.",

              labels: [
                "bug",
              ],
            },
          });

        dependencies.analyzeDuplicates.mockResolvedValue(
          {
            isDuplicate: false,

            duplicateIssue: null,

            reason:
              "No candidate describes the same problem.",
          }
        );

        vi.mocked(
          client.callTool
        ).mockResolvedValue({
          content: [
            {
              type: "text",

              text:
                "GitHub issue created successfully.",
            },
          ],
        } as never);

        const result =
          await runWorkflow({
            client,

            tools,

            owner: "test",

            repo: "repo",

            model:
              "test-model",

            dependencies,
          });

        expect(result.status).toBe(
          "created"
        );

        expect(
          dependencies.gatherIssueDetails
        ).toHaveBeenCalledWith(
          "Login button does not work"
        );

        expect(
          dependencies.requestIssueApproval
        ).toHaveBeenCalledWith({
          title:
            "Bug: Login button does not work",

          body:
            "Login button fails.",

          labels: [
            "bug",
          ],
        });

        expect(
          client.callTool
        ).toHaveBeenCalledWith({
          name:
            "create_github_issue",

          arguments: {
            owner: "test",

            repo: "repo",

            title:
              "Bug: Login button does not work",

            body:
              "Login button fails.",

            labels: [
              "bug",
            ],
          },
        });
      }
    );

    it(
      "does not create an issue when approval is rejected",
      async () => {
        const client =
          createMockClient();

        const dependencies =
          createBaseDependencies();

        dependencies.runAgent
          .mockResolvedValueOnce({
            finalResponse: "",

            duplicateResult: {
              candidates: [],
            },
          })
          .mockResolvedValueOnce({
            finalResponse: "",

            proposedIssue: {
              title:
                "Bug: Something is broken",

              body:
                "Something is broken.",

              labels: [
                "bug",
              ],
            },
          });

        dependencies.analyzeDuplicates.mockResolvedValue(
          {
            isDuplicate: false,

            duplicateIssue: null,

            reason:
              "No duplicate found.",
          }
        );

        dependencies.requestIssueApproval.mockResolvedValue(
          false
        );

        const result =
          await runWorkflow({
            client,

            tools,

            owner: "test",

            repo: "repo",

            model:
              "test-model",

            dependencies,
          });

        expect(result).toEqual({
          status: "cancelled",
        });

        expect(
          client.callTool
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "throws when issue generation returns no proposed issue",
      async () => {
        const client =
          createMockClient();

        const dependencies =
          createBaseDependencies();

        dependencies.runAgent
          .mockResolvedValueOnce({
            finalResponse: "",

            duplicateResult: {
              candidates: [],
            },
          })
          .mockResolvedValueOnce({
            finalResponse: "",
          });

        dependencies.analyzeDuplicates.mockResolvedValue(
          {
            isDuplicate: false,

            duplicateIssue: null,

            reason:
              "No duplicate found.",
          }
        );

        await expect(
          runWorkflow({
            client,

            tools,

            owner: "test",

            repo: "repo",

            model:
              "test-model",

            dependencies,
          })
        ).rejects.toThrow(
          "The generation phase did not return a proposed issue."
        );

        expect(
          dependencies.requestIssueApproval
        ).not.toHaveBeenCalled();

        expect(
          client.callTool
        ).not.toHaveBeenCalled();
      }
    );
  }
);