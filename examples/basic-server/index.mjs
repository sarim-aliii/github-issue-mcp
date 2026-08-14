import {
  createGitHubIssueMcpServer,
} from "github-issue-mcp/server";

const server =
  createGitHubIssueMcpServer();

console.log(
  "GitHub Issue MCP server created:",
  Boolean(server)
);