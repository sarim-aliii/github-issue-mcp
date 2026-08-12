import "dotenv/config";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerGenerateIssueTool } from "./tools/generate-issue.js";
import { registerCreateIssueTool } from "./tools/create-issue.js";
import { registerListIssuesTool } from "./tools/list-issues.js";
import { registerListLabelsTool } from "./tools/list-labels.js";
import { registerCheckDuplicateTool } from "./tools/check-duplicate.js";

const server = new McpServer({
  name: "github-issue-mcp",
  version: "1.0.0",
});

registerGenerateIssueTool(server);
registerCreateIssueTool(server);
registerListIssuesTool(server);
registerListLabelsTool(server);
registerCheckDuplicateTool(server);

const transport =
  new StdioServerTransport();

await server.connect(transport);