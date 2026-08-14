import {
  Client,
} from "@modelcontextprotocol/sdk/client/index.js";

import {
  StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio.js";

import {
  existsSync,
} from "node:fs";

import {
  resolve,
} from "node:path";

const projectRoot =
  resolve(
    import.meta.dirname,
    "../.."
  );

const localCli =
  resolve(
    projectRoot,
    "dist",
    "server",
    "cli.js"
  );

if (!existsSync(localCli)) {
  throw new Error(
    [
      "Local MCP CLI was not found.",
      "",
      `Expected: ${localCli}`,
      "",
      "Run:",
      "  npm run build",
      "",
      "Then run this example again.",
    ].join("\n")
  );
}

console.log(
  "Starting local GitHub Issue MCP server..."
);

const transport =
  new StdioClientTransport({
    command: process.execPath,
    args: [localCli],
  });

const client =
  new Client({
    name: "github-issue-mcp-example",
    version: "1.0.0",
  });

await client.connect(transport);

const result =
  await client.listTools();

const expectedTools = [
  "generate_issue",
  "create_github_issue",
  "list_github_issues",
  "list_github_labels",
  "check_duplicate_issue",
];

const discoveredTools =
  result.tools.map(
    (tool) => tool.name
  );

console.log(
  "\nAvailable GitHub Issue MCP tools:\n"
);

for (const tool of result.tools) {
  console.log(
    `- ${tool.name}: ${tool.description}`
  );
}

const missingTools =
  expectedTools.filter(
    (name) =>
      !discoveredTools.includes(name)
  );

if (missingTools.length > 0) {
  throw new Error(
    `Missing expected MCP tools: ${missingTools.join(", ")}`
  );
}

console.log(
  "\nAll expected MCP tools are available."
);

console.log(
  "Consumer integration test passed."
);