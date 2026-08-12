import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { GoogleGenAI } from "@google/genai";

import type { getIssueDescription } from "./cli.js";
import type { gatherIssueDetails } from "./issue-details.js";
import type { requestIssueApproval } from "./approval.js";
import type { runAgent, analyzeDuplicates } from "./agent.js";

export interface ClientDependencies {
  getIssueDescription: typeof getIssueDescription;
  gatherIssueDetails: typeof gatherIssueDetails;
  requestIssueApproval: typeof requestIssueApproval;
  runAgent: typeof runAgent;
  analyzeDuplicates: typeof analyzeDuplicates;
  ai: GoogleGenAI;
}

export interface WorkflowOptions {
  client: Client;
  tools: any[];
  owner: string;
  repo: string;
  model: string;
  dependencies: ClientDependencies;
}

export type WorkflowResult =
  | {
      status: "duplicate";
      issue: {
        number: number;
        title: string;
        url: string;
      };
    }
  | {
      status: "cancelled";
    }
  | {
      status: "created";
      result: unknown;
    };

export async function runWorkflow({
  client,
  tools,
  owner,
  repo,
  model,
  dependencies,
}: WorkflowOptions): Promise<WorkflowResult> {
  const {
    getIssueDescription,
    gatherIssueDetails,
    requestIssueApproval,
    runAgent,
    analyzeDuplicates,
    ai,
  } = dependencies;

  // =========================================
  // GET ISSUE DESCRIPTION
  // =========================================

  const issueDescription =
    await getIssueDescription();

  // =========================================
  // PHASE 1 — DUPLICATE CANDIDATE RETRIEVAL
  // =========================================

  console.error(
    "\n================================"
  );

  console.error(
    "DUPLICATE CHECK"
  );

  console.error(
    "================================"
  );

  const duplicateCheck =
    await runAgent({
      client,
      ai,
      tools,
      model,

      phase:
        "duplicate_check",

      userRequest: `
You are checking a GitHub issue for duplicates.

Repository:
${owner}/${repo}

Proposed issue:

"${issueDescription}"

Use check_duplicate_issue to retrieve
candidate existing issues.

Do not generate an issue.
Do not create an issue.

Your only task is to retrieve the
candidate issues and return their results.
`,
    });

  const candidates =
    duplicateCheck
      .duplicateResult
      ?.candidates ?? [];

  console.error(
    `\nFound ${candidates.length} candidate issue(s).`
  );

  // =========================================
  // PHASE 1B — SEMANTIC ANALYSIS
  // =========================================

  const duplicateAnalysis =
    await analyzeDuplicates(
      ai,
      model,
      issueDescription,
      candidates
    );

  console.error(
    "\nSemantic duplicate analysis:"
  );

  console.error(
    JSON.stringify(
      duplicateAnalysis,
      null,
      2
    )
  );

  // =========================================
  // DUPLICATE FOUND
  // =========================================

  if (
    duplicateAnalysis.isDuplicate &&
    duplicateAnalysis.duplicateIssue
  ) {
    console.error(
      "\n================================"
    );

    console.error(
      "DUPLICATE ISSUE FOUND"
    );

    console.error(
      "================================\n"
    );

    console.error(
      `Issue #${duplicateAnalysis.duplicateIssue.number}`
    );

    console.error(
      `Title: ${duplicateAnalysis.duplicateIssue.title}`
    );

    console.error(
      `URL: ${duplicateAnalysis.duplicateIssue.url}`
    );

    console.error(
      `\nReason: ${duplicateAnalysis.reason}`
    );

    console.error(
      "\nNo new issue will be generated."
    );

    return {
      status: "duplicate",
      issue:
        duplicateAnalysis.duplicateIssue,
    };
  }

  // =========================================
  // PHASE 2 — GATHER DETAILS
  // =========================================

  console.error(
    "\n================================"
  );

  console.error(
    "NO DUPLICATE FOUND"
  );

  console.error(
    "================================"
  );

  const details =
    await gatherIssueDetails(
      issueDescription
    );

  // =========================================
  // PHASE 3 — GENERATE ISSUE
  // =========================================

  console.error(
    "\n================================"
  );

  console.error(
    "GENERATING GITHUB ISSUE"
  );

  console.error(
    "================================"
  );

  const generated =
    await runAgent({
      client,
      ai,
      tools,
      model,

      phase: "generate",

      userRequest: `
Generate a structured GitHub issue.

Repository:
${owner}/${repo}

Issue type:
bug

Description:
${details.description}

Steps to reproduce:
${details.reproductionSteps || "Not provided"}

Expected behavior:
${details.expectedBehavior || "Not provided"}

Actual behavior:
${details.actualBehavior || "Not provided"}

Environment:
${details.environment || "Not provided"}

Additional context:
${details.additionalContext || "Not provided"}

Use the generate_issue MCP tool.

Pass all of the provided information
to the tool.

Do not create the GitHub issue.
Only generate the proposed issue.
`,
    });

  if (!generated.proposedIssue) {
    throw new Error(
      "The generation phase did not return a proposed issue."
    );
  }

  // =========================================
  // PHASE 4 — HUMAN APPROVAL
  // =========================================

  const approved =
    await requestIssueApproval(
      generated.proposedIssue
    );

  if (!approved) {
    console.error(
      "\nIssue creation cancelled."
    );

    return {
      status: "cancelled",
    };
  }

  // =========================================
  // PHASE 5 — CREATE ISSUE
  // =========================================

  console.error(
    "\nCreating GitHub issue..."
  );

  const created =
    await client.callTool({
      name: "create_github_issue",

      arguments: {
        owner,
        repo,

        title:
          generated.proposedIssue.title,

        body:
          generated.proposedIssue.body,

        labels:
          generated.proposedIssue.labels,
      },
    });

  console.error(
    "\n================================"
  );

  console.error(
    "GITHUB ISSUE CREATED"
  );

  console.error(
    "================================\n"
  );

  console.error(
    JSON.stringify(
      created,
      null,
      2
    )
  );

  return {
    status: "created",
    result: created,
  };
}