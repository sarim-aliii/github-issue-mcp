import {
  StdioServerTransport,
} from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  createGitHubIssueMcpServer,
  type GitHubIssueMcpServerOptions,
} from "./create-server.js";


export interface StartStdioServerOptions
  extends GitHubIssueMcpServerOptions {}

  
export async function startStdioServer(
  options: StartStdioServerOptions = {}
) {
  const server =
    createGitHubIssueMcpServer(options);

  const transport =
    new StdioServerTransport();

  await server.connect(transport);

  return {
    server,
    transport,
  };
}