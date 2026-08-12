import "dotenv/config";

import {
  startStdioServer,
} from "./server/stdio.js";

try {
  await startStdioServer({
    name: "github-issue-mcp",
    version: "1.0.0",
  });
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  );

  process.exit(1);
}