import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  Client,
} from "@modelcontextprotocol/sdk/client/index.js";

import {
  InMemoryTransport,
} from "@modelcontextprotocol/sdk/inMemory.js";

import {
  createGitHubIssueMcpServer,
} from "../../src/server/create-server.js";

describe(
  "GitHub Issue MCP server factory",
  () => {
    afterEach(() => {
      delete process.env.GITHUB_TOKEN;
    });

    it(
      "creates a server with all GitHub issue tools",
      async () => {
        process.env.GITHUB_TOKEN =
          "test-token";

        const server =
          createGitHubIssueMcpServer();

        const client =
          new Client({
            name:
              "test-client",

            version:
              "1.0.0",
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

        const result =
          await client.listTools();

        const names =
          result.tools
            .map(
              (tool) =>
                tool.name
            )
            .sort();

        expect(names).toEqual([
          "check_duplicate_issue",
          "create_github_issue",
          "generate_issue",
          "list_github_issues",
          "list_github_labels",
        ]);

        await client.close();
      }
    );

    it(
      "allows custom server metadata",
      async () => {
        process.env.GITHUB_TOKEN =
          "test-token";

        const server =
          createGitHubIssueMcpServer({
            name:
              "custom-github-issue-server",

            version:
              "2.0.0",
          });

        const client =
          new Client({
            name:
              "test-client",

            version:
              "1.0.0",
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

        const result =
          await client.listTools();

        expect(
          result.tools
        ).toHaveLength(5);

        await client.close();
      }
    );
  }
);