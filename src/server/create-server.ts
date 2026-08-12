import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { registerGenerateIssueTool } from "../tools/generate-issue.js";
import { registerCreateIssueTool } from "../tools/create-issue.js";
import { registerListIssuesTool } from "../tools/list-issues.js";
import { registerListLabelsTool } from "../tools/list-labels.js";
import { registerCheckDuplicateTool } from "../tools/check-duplicate.js";

export interface GitHubIssueMcpServerOptions {
  name?: string;
  version?: string;
}

const DEFAULT_SERVER_NAME = "github-issue-mcp";
const DEFAULT_SERVER_VERSION = "1.0.0";

/**
 * Creates a fully configured GitHub Issue MCP server.
 *
 * This factory intentionally has no dependency on:
 * - Gemini
 * - the CLI
 * - a specific MCP transport
 *
 * This allows the same server to be used by:
 * - stdio
 * - HTTP
 * - tests
 * - other host applications
 */
export function createGitHubIssueMcpServer(
  options: GitHubIssueMcpServerOptions = {}
): McpServer {
  const server = new McpServer({
    name:
      options.name ??
      DEFAULT_SERVER_NAME,

    version:
      options.version ??
      DEFAULT_SERVER_VERSION,
  });

  registerGenerateIssueTool(server);

  registerCreateIssueTool(server);

  registerListIssuesTool(server);

  registerListLabelsTool(server);

  registerCheckDuplicateTool(server);

  return server;
}