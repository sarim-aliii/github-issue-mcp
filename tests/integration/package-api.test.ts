import {
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


describe("Public package API", () => {
  it(
    "creates a reusable MCP server with all expected tools",
    async () => {
      const server =
        createGitHubIssueMcpServer({
          name:
            "package-api-test-server",

          version:
            "1.0.0",
        });

      expect(server).toBeDefined();


      const client =
        new Client({
          name:
            "package-api-test-client",

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


      const toolNames =
        result.tools.map(
          (tool) => tool.name
        );


      expect(toolNames).toEqual(
        expect.arrayContaining([
          "generate_issue",
          "create_github_issue",
          "list_github_issues",
          "list_github_labels",
          "check_duplicate_issue",
        ])
      );


      expect(toolNames).toHaveLength(5);


      await client.close();
      await server.close();
    }
  );
});