import "dotenv/config";

import {
  fileURLToPath,
} from "node:url";

import {
  resolve,
} from "node:path";

import {
  Client,
} from "@modelcontextprotocol/sdk/client/index.js";

import {
  StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio.js";

import {
  ai as defaultAI,
} from "./ai-client.js";

import {
  runAgent as defaultRunAgent,
  analyzeDuplicates as defaultAnalyzeDuplicates,
} from "./agent.js";

import {
  requestIssueApproval as defaultRequestIssueApproval,
} from "./approval.js";

import {
  getIssueDescription as defaultGetIssueDescription,
} from "./cli.js";

import {
  gatherIssueDetails as defaultGatherIssueDetails,
} from "./issue-details.js";

import {
  config,
} from "./config.js";

import {
  runWorkflow,
  type ClientDependencies,
} from "./workflow.js";


export interface MainDependencies
  extends ClientDependencies {}


export interface MainOptions {
  dependencies?: Partial<ClientDependencies>;
}


/**
 * Read repository configuration from
 * environment variables.
 */
function getRepositoryConfig() {
  const owner =
    process.env.GITHUB_OWNER;

  const repo =
    process.env.GITHUB_REPO;

  if (!owner || !repo) {
    throw new Error(
      "GITHUB_OWNER and GITHUB_REPO must be configured"
    );
  }

  return {
    owner,
    repo,
  };
}


/**
 * Resolve the project root independently
 * of the directory from which the CLI
 * was launched.
 */
function getProjectRoot(): string {
  return resolve(
    fileURLToPath(import.meta.url),
    "../../.."
  );
}


/**
 * Build the dependencies used by the
 * application workflow.
 *
 * Tests can override individual
 * dependencies without mocking the
 * entire module.
 */
function createDependencies(
  overrides?: Partial<ClientDependencies>
): ClientDependencies {
  return {
    getIssueDescription:
      overrides?.getIssueDescription ??
      defaultGetIssueDescription,

    gatherIssueDetails:
      overrides?.gatherIssueDetails ??
      defaultGatherIssueDetails,

    requestIssueApproval:
      overrides?.requestIssueApproval ??
      defaultRequestIssueApproval,

    runAgent:
      overrides?.runAgent ??
      defaultRunAgent,

    analyzeDuplicates:
      overrides?.analyzeDuplicates ??
      defaultAnalyzeDuplicates,

    ai:
      overrides?.ai ??
      defaultAI,
  };
}


/**
 * Main application entry point.
 */
export async function main(
  options: MainOptions = {}
) {
  // =========================================
  // REPOSITORY CONFIGURATION
  // =========================================

  const {
    owner,
    repo,
  } = getRepositoryConfig();


  // =========================================
  // CREATE MCP CLIENT
  // =========================================

  const client =
    new Client({
      name:
        "github-issue-mcp-client",

      version:
        "1.0.0",
    });


  // =========================================
  // CREATE STDIO TRANSPORT
  // =========================================

  const transport =
    new StdioClientTransport({
      command: "npx",

      args: [
        "tsx",
        "src/index.ts",
      ],

      cwd: getProjectRoot(),
    });


  // =========================================
  // CONNECT TO MCP SERVER
  // =========================================

  await client.connect(
    transport
  );

  console.error(
    "Connected to GitHub Issue MCP server."
  );


  // =========================================
  // DISCOVER MCP TOOLS
  // =========================================

  const tools =
    await client.listTools();


  /*
   * The autonomous Gemini agent must
   * never receive the create tool.
   *
   * Creation is controlled explicitly
   * by the client after human approval.
   */
  const readOnlyTools =
    tools.tools.filter(
      (tool) =>
        tool.name !==
        "create_github_issue"
    );


  console.error(
    "\nAvailable MCP tools:"
  );

  for (
    const tool of tools.tools
  ) {
    console.error(
      `- ${tool.name}: ${tool.description ?? ""}`
    );
  }


  console.error(
    "\nGemini tool access is phase-restricted:"
  );

  console.error(
    "\nPhase 1 - Duplicate detection:"
  );

  console.error(
    "- check_duplicate_issue"
  );

  console.error(
    "\nPhase 3 - Issue generation:"
  );

  console.error(
    "- generate_issue"
  );

  console.error(
    "\nPhase 5 - Issue creation:"
  );

  console.error(
    "- create_github_issue (client-controlled only)"
  );


  // =========================================
  // APPLICATION HEADER
  // =========================================

  console.error(
    "\n================================"
  );

  console.error(
    "   GitHub Issue MCP Assistant"
  );

  console.error(
    "================================\n"
  );

  console.error(
    `Repository: ${owner}/${repo}`
  );


  // =========================================
  // DEPENDENCIES
  // =========================================

  const dependencies =
    createDependencies(
      options.dependencies
    );


  // =========================================
  // RUN WORKFLOW
  // =========================================

  return runWorkflow({
    client,

    tools:
      readOnlyTools,

    owner,

    repo,

    model:
      config.geminiModel,

    dependencies,
  });
}


/**
 * Determine whether this module is the
 * file directly executed by Node/tsx.
 *
 * This prevents main() from running when
 * the module is imported by Vitest or
 * another module.
 *
 * Works with both Windows and POSIX paths.
 */
function isDirectExecution(): boolean {
  const entryPoint =
    process.argv[1];

  if (!entryPoint) {
    return false;
  }

  try {
    const currentFile =
      resolve(
        fileURLToPath(
          import.meta.url
        )
      );

    const executedFile =
      resolve(entryPoint);

    return (
      currentFile ===
      executedFile
    );
  } catch {
    return false;
  }
}


/**
 * CLI entry point.
 *
 * Importing this module does NOT execute
 * the workflow.
 *
 * Running:
 *
 *   npx tsx src/client/index.ts
 *
 * executes main().
 */
if (isDirectExecution()) {
  main().catch(
    (error) => {
      console.error(
        "\nFatal error:"
      );

      console.error(
        error instanceof Error
          ? error.message
          : String(error)
      );

      process.exit(1);
    }
  );
}