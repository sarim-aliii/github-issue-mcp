import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { GeneratedIssue } from "../types/issue.js";

interface GenerateIssueInput {
  description: string;
  type: "bug" | "feature" | "task";
  reproductionSteps?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  environment?: string;
  additionalContext?: string;
  labels?: string[];
}

export function generateIssue({
  description,
  type,
  reproductionSteps,
  expectedBehavior,
  actualBehavior,
  environment,
  additionalContext,
  labels,
}: GenerateIssueInput): GeneratedIssue {
  let title: string;

  switch (type) {
    case "bug":
      title = `Bug: ${description}`;
      break;

    case "feature":
      title = `Feature: ${description}`;
      break;

    case "task":
      title = `Task: ${description}`;
      break;
  }

  const body = `## Description

${description}

## Steps to Reproduce

${
  reproductionSteps?.trim()
    ? reproductionSteps
    : "<!-- Add reproduction steps -->"
}

## Expected Behavior

${
  expectedBehavior?.trim()
    ? expectedBehavior
    : "<!-- What should happen? -->"
}

## Actual Behavior

${
  actualBehavior?.trim()
    ? actualBehavior
    : "<!-- What currently happens? -->"
}

## Environment

${
  environment?.trim()
    ? environment
    : "<!-- Browser, OS, application version, etc. -->"
}

## Additional Context

${
  additionalContext?.trim()
    ? additionalContext
    : "<!-- Add logs, screenshots, related information, etc. -->"
}
`;

  return {
    title,
    body,
    labels:
      labels && labels.length > 0
        ? labels
        : [type],
  };
}

export function registerGenerateIssueTool(
  server: McpServer
) {
  server.tool(
    "generate_issue",
    "Generate a structured GitHub issue using the issue description, issue details, and repository labels.",
    {
      description: z
        .string()
        .min(5)
        .describe(
          "Short natural-language description of the problem or request"
        ),

      type: z
        .enum(["bug", "feature", "task"])
        .describe("Type of GitHub issue"),

      reproductionSteps: z
        .string()
        .optional()
        .describe(
          "Steps required to reproduce the issue"
        ),

      expectedBehavior: z
        .string()
        .optional()
        .describe(
          "What should happen"
        ),

      actualBehavior: z
        .string()
        .optional()
        .describe(
          "What actually happens"
        ),

      environment: z
        .string()
        .optional()
        .describe(
          "Browser, operating system, application version, etc."
        ),

      additionalContext: z
        .string()
        .optional()
        .describe(
          "Logs, screenshots, related information, or other useful context"
        ),

      labels: z
        .array(z.string())
        .optional()
        .describe(
          "Labels selected from the repository's available GitHub labels"
        ),
    },

    async ({
      description,
      type,
      reproductionSteps,
      expectedBehavior,
      actualBehavior,
      environment,
      additionalContext,
      labels,
    }) => {
      const issue = generateIssue({
        description,
        type,
        reproductionSteps,
        expectedBehavior,
        actualBehavior,
        environment,
        additionalContext,
        labels,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              issue,
              null,
              2
            ),
          },
        ],
      };
    }
  );
}