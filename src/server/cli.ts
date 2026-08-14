#!/usr/bin/env node

import "dotenv/config";

import {
  startStdioServer,
} from "./stdio.js";

async function main(): Promise<void> {
  await startStdioServer();
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : String(error)
  );

  process.exit(1);
});