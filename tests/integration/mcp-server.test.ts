import {
  afterEach,
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
  registerListLabelsTool,
} from "../../src/tools/list-labels.js";

import {
  registerCheckDuplicateTool,
} from "../../src/tools/check-duplicate.js";

import {
  registerListIssuesTool,
} from "../../src/tools/list-issues.js";

import {
  registerCreateIssueTool,
} from "../../src/tools/create-issue.js";

describe(
  "MCP server integration",
  () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    async function createConnectedClient() {
      const server =
        new McpServer({
          name:
            "github-issue-mcp-test-server",

          version: "1.0.0",
        });

      registerGenerateIssueTool(
        server
      );

      registerListLabelsTool(
        server
      );

      registerCheckDuplicateTool(
        server
      );

      registerListIssuesTool(
        server
      );

      registerCreateIssueTool(
        server
      );

      const [
        clientTransport,
        serverTransport,
      ] =
        InMemoryTransport
          .createLinkedPair();

      await server.connect(
        serverTransport
      );

      const client =
        new Client({
          name:
            "github-issue-mcp-test-client",

          version: "1.0.0",
        });

      await client.connect(
        clientTransport
      );

      return {
        client,
        server,
      };
    }

    it(
      "discovers all expected MCP tools",
      async () => {
        const {
          client,
        } =
          await createConnectedClient();

        const result =
          await client.listTools();

        const names =
          result.tools.map(
            (tool) =>
              tool.name
          );

        expect(
          names
        ).toEqual(
          expect.arrayContaining([
            "generate_issue",
            "list_github_issues",
            "list_github_labels",
            "check_duplicate_issue",
            "create_github_issue",
          ])
        );

        expect(
          names
        ).toHaveLength(5);
      }
    );

    it(
      "calls generate_issue through MCP",
      async () => {
        const {
          client,
        } =
          await createConnectedClient();

        const result =
          await client.callTool({
            name:
              "generate_issue",

            arguments: {
              description:
                "Login button does not work",

              type: "bug",

              reproductionSteps:
                "Open login page and click Login.",

              expectedBehavior:
                "User should reach dashboard.",

              actualBehavior:
                "Nothing happens.",

              environment:
                "Chrome on Windows.",

              additionalContext:
                "Issue occurs consistently.",
            },
          });

        expect(
          result.isError
        ).not.toBe(true);

        const text =
          (
            result.content as Array<{
              type: string;
              text?: string;
            }>
          ).find(
            (item) =>
              item.type === "text"
          )?.text ?? "";

        const issue =
          JSON.parse(text);

        expect(
          issue.title
        ).toBe(
          "Bug: Login button does not work"
        );

        expect(
          issue.labels
        ).toEqual([
          "bug",
        ]);

        expect(
          issue.body
        ).toContain(
          "Login button does not work"
        );
      }
    );

    it(
      "exposes correct tool schemas",
      async () => {
        const {
          client,
        } =
          await createConnectedClient();

        const result =
          await client.listTools();

        const generateTool =
          result.tools.find(
            (tool) =>
              tool.name ===
              "generate_issue"
          );

        expect(
          generateTool
        ).toBeDefined();

        expect(
          generateTool?.inputSchema
        ).toBeDefined();

        expect(
          generateTool?.inputSchema
            .properties
        ).toHaveProperty(
          "description"
        );

        expect(
          generateTool?.inputSchema
            .properties
        ).toHaveProperty(
          "type"
        );
      }
    );
  }
);