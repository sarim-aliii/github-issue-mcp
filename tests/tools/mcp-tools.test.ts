import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  Client,
} from "@modelcontextprotocol/sdk/client/index.js";

import {
  InMemoryTransport,
} from "@modelcontextprotocol/sdk/inMemory.js";

import {
  McpServer,
} from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  registerGenerateIssueTool,
} from "../../src/tools/generate-issue.js";

import {
  registerListIssuesTool,
} from "../../src/tools/list-issues.js";

import {
  registerListLabelsTool,
} from "../../src/tools/list-labels.js";

import {
  registerCheckDuplicateTool,
} from "../../src/tools/check-duplicate.js";

import {
  registerCreateIssueTool,
} from "../../src/tools/create-issue.js";


/*
 * Create a real MCP client/server pair
 * using the SDK's in-memory transport.
 *
 * This allows the tests to exercise the
 * actual MCP protocol instead of calling
 * McpServer internals directly.
 */
async function createTestClient(
  registerTools: (
    server: McpServer
  ) => void
) {
  const server =
    new McpServer({
      name: "test-server",
      version: "1.0.0",
    });

  registerTools(server);

  const client =
    new Client({
      name: "test-client",
      version: "1.0.0",
    });

  const [
    clientTransport,
    serverTransport,
  ] =
    InMemoryTransport.createLinkedPair();

  await server.connect(
    serverTransport
  );

  await client.connect(
    clientTransport
  );

  return {
    client,
    server,
  };
}


describe("MCP tools", () => {
  beforeEach(() => {
    process.env.GITHUB_TOKEN =
      "test-token";
  });


  afterEach(() => {
    delete process.env.GITHUB_TOKEN;

    vi.restoreAllMocks();
  });


  // ========================================
  // generate_issue
  // ========================================

  it(
    "registers the generate_issue tool",
    async () => {
      const {
        client,
      } =
        await createTestClient(
          (server) => {
            registerGenerateIssueTool(
              server
            );
          }
        );

      const result =
        await client.listTools();

      const tool =
        result.tools.find(
          (tool) =>
            tool.name ===
            "generate_issue"
        );

      expect(tool).toBeDefined();

      expect(
        tool?.description
      ).toContain(
        "Generate a structured GitHub issue"
      );

      await client.close();
    }
  );


  it(
    "calls generate_issue through MCP",
    async () => {
      const {
        client,
      } =
        await createTestClient(
          (server) => {
            registerGenerateIssueTool(
              server
            );
          }
        );

      const result =
        await client.callTool({
          name:
            "generate_issue",

          arguments: {
            description:
              "The export button does not work.",

            type:
              "bug",

            reproductionSteps:
              "Open reports and click Export.",

            expectedBehavior:
              "The report should download.",

            actualBehavior:
              "Nothing happens.",

            environment:
              "Chrome 151 on Windows 11",

            additionalContext:
              "Happens consistently.",
          },
        });

      expect(result).toBeDefined();

      expect(
        result.content
      ).toBeDefined();

      const text =
        result.content.find(
          (item) =>
            item.type === "text"
        );

      expect(text).toBeDefined();

      const issue =
        JSON.parse(
          text?.text ?? ""
        );

      expect(
        issue.title
      ).toBe(
        "Bug: The export button does not work."
      );

      expect(
        issue.labels
      ).toEqual([
        "bug",
      ]);

      expect(
        issue.body
      ).toContain(
        "The export button does not work."
      );

      expect(
        issue.body
      ).toContain(
        "Open reports and click Export."
      );

      expect(
        issue.body
      ).toContain(
        "The report should download."
      );

      expect(
        issue.body
      ).toContain(
        "Nothing happens."
      );

      expect(
        issue.body
      ).toContain(
        "Chrome 151 on Windows 11"
      );

      await client.close();
    }
  );


  // ========================================
  // list_github_issues
  // ========================================

  it(
    "registers the list_github_issues tool",
    async () => {
      const mockIssues = [
        {
          number: 1,
          title:
            "Export button does nothing",
          body:
            "The export button is broken.",
          html_url:
            "https://github.com/test/repo/issues/1",
          state:
            "open",
        },
      ];

      vi.spyOn(
        globalThis,
        "fetch"
      ).mockResolvedValue(
        new Response(
          JSON.stringify(
            mockIssues
          ),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        )
      );

      const {
        client,
      } =
        await createTestClient(
          (server) => {
            registerListIssuesTool(
              server
            );
          }
        );

      const result =
        await client.callTool({
          name:
            "list_github_issues",

          arguments: {
            owner:
              "test-owner",

            repo:
              "test-repo",
          },
        });

      expect(result).toBeDefined();

      expect(
        result.isError
      ).not.toBe(true);

      const text =
        result.content.find(
          (item) =>
            item.type === "text"
        );

      expect(text).toBeDefined();

      expect(
        JSON.parse(
          text?.text ?? ""
        )
      ).toEqual(
        mockIssues
      );

      await client.close();
    }
  );


  // ========================================
  // list_github_labels
  // ========================================

  it(
    "registers the list_github_labels tool",
    async () => {
      const mockLabels = [
        {
          name:
            "bug",

          description:
            "Something isn't working",

          color:
            "d73a4a",
        },

        {
          name:
            "enhancement",

          description:
            "New feature or request",

          color:
            "a2eeef",
        },
      ];

      vi.spyOn(
        globalThis,
        "fetch"
      ).mockResolvedValue(
        new Response(
          JSON.stringify(
            mockLabels
          ),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        )
      );

      const {
        client,
      } =
        await createTestClient(
          (server) => {
            registerListLabelsTool(
              server
            );
          }
        );

      const result =
        await client.callTool({
          name:
            "list_github_labels",

          arguments: {
            owner:
              "test-owner",

            repo:
              "test-repo",
          },
        });

      expect(result).toBeDefined();

      expect(
        result.isError
      ).not.toBe(true);

      const text =
        result.content.find(
          (item) =>
            item.type === "text"
        );

      expect(text).toBeDefined();

      expect(
        JSON.parse(
          text?.text ?? ""
        )
      ).toEqual(
        mockLabels
      );

      await client.close();
    }
  );


  // ========================================
  // check_duplicate_issue
  // ========================================

  it(
    "registers the check_duplicate_issue tool",
    async () => {
      const mockIssues = [
        {
          number:
            1,

          title:
            "Export button does nothing",

          body:
            "The export button is broken.",

          html_url:
            "https://github.com/test/repo/issues/1",

          state:
            "open",
        },
      ];

      vi.spyOn(
        globalThis,
        "fetch"
      ).mockResolvedValue(
        new Response(
          JSON.stringify(
            mockIssues
          ),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        )
      );

      const {
        client,
      } =
        await createTestClient(
          (server) => {
            registerCheckDuplicateTool(
              server
            );
          }
        );

      const result =
        await client.callTool({
          name:
            "check_duplicate_issue",

          arguments: {
            owner:
              "test-owner",

            repo:
              "test-repo",

            description:
              "The export button does not work.",
          },
        });

      expect(result).toBeDefined();

      expect(
        result.isError
      ).not.toBe(true);

      const text =
        result.content.find(
          (item) =>
            item.type === "text"
        );

      expect(text).toBeDefined();

      const parsed =
        JSON.parse(
          text?.text ?? ""
        );

      expect(
        parsed
      ).toHaveProperty(
        "candidates"
      );

      await client.close();
    }
  );


  // ========================================
  // create_github_issue
  // ========================================

  it(
    "registers the create_github_issue tool",
    async () => {
      const mockLabels = [
        {
          name:
            "bug",

          description:
            "Something isn't working",

          color:
            "d73a4a",
        },
      ];

      const mockIssue = {
        number:
          20,

        title:
          "Bug: Export button does not work",

        body:
          "The export button is broken.",

        html_url:
          "https://github.com/test/repo/issues/20",

        state:
          "open",
      };

      vi.spyOn(
        globalThis,
        "fetch"
      ).mockImplementation(
        async (
          input:
            RequestInfo | URL,

          init?:
            RequestInit
        ) => {
          const url =
            String(input);

          // Label validation request
          if (
            url.includes(
              "/labels?"
            )
          ) {
            return new Response(
              JSON.stringify(
                mockLabels
              ),
              {
                status:
                  200,

                headers: {
                  "Content-Type":
                    "application/json",
                },
              }
            );
          }

          // Issue creation request
          if (
            url.includes(
              "/issues"
            ) &&
            init?.method ===
              "POST"
          ) {
            return new Response(
              JSON.stringify(
                mockIssue
              ),
              {
                status:
                  201,

                headers: {
                  "Content-Type":
                    "application/json",
                },
              }
            );
          }

          return new Response(
            JSON.stringify({
              message:
                "Unexpected request",
            }),
            {
              status:
                500,

              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );
        }
      );

      const {
        client,
      } =
        await createTestClient(
          (server) => {
            registerCreateIssueTool(
              server
            );
          }
        );

      const result =
        await client.callTool({
          name:
            "create_github_issue",

          arguments: {
            owner:
              "test-owner",

            repo:
              "test-repo",

            title:
              "Bug: Export button does not work",

            body:
              "The export button is broken.",

            labels: [
              "bug",
            ],
          },
        });

      expect(result).toBeDefined();

      expect(
        result.isError
      ).not.toBe(true);

      const text =
        result.content.find(
          (item) =>
            item.type === "text"
        );

      expect(text).toBeDefined();

      expect(
        text?.text
      ).toContain(
        "GitHub issue created successfully"
      );

      expect(
        text?.text
      ).toContain(
        "Issue #20"
      );

      await client.close();
    }
  );


  // ========================================
  // Error handling
  // ========================================

  it(
    "returns an MCP error when GitHub fails",
    async () => {
      vi.spyOn(
        globalThis,
        "fetch"
      ).mockResolvedValue(
        new Response(
          JSON.stringify({
            message:
              "Repository not found",
          }),
          {
            status:
              404,

            headers: {
              "Content-Type":
                "application/json",
            },
          }
        )
      );

      const {
        client,
      } =
        await createTestClient(
          (server) => {
            registerListIssuesTool(
              server
            );
          }
        );

      const result =
        await client.callTool({
          name:
            "list_github_issues",

          arguments: {
            owner:
              "invalid-owner",

            repo:
              "invalid-repo",
          },
        });

      expect(result).toBeDefined();

      expect(
        result.isError
      ).toBe(true);

      const text =
        result.content.find(
          (item) =>
            item.type === "text"
        );

      expect(text).toBeDefined();

      expect(
        text?.text
      ).toContain(
        "GitHub API error 404"
      );

      await client.close();
    }
  );
});