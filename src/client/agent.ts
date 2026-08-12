import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { GoogleGenAI } from "@google/genai";

import { config } from "./config.js";
import { logger } from "./logger.js";

interface AgentOptions {
  client: Client;
  ai: GoogleGenAI;
  tools: any[];
  model: string;
  userRequest: string;
  phase?: "duplicate_check" | "generate";
}

export interface AgentResult {
  finalResponse: string;

  proposedIssue?: {
    title: string;
    body: string;
    labels: string[];
  };

  duplicateResult?: {
    candidates: Array<{
      number: number;
      title: string;
      body?: string | null;
      url: string;
      similarity: number;
    }>;
  };
}

function extractTextContent(result: any): string {
  const content = result.content as Array<{
    type: string;
    text?: string;
  }>;

  const textContent = content.find(
    (item) => item.type === "text"
  );

  if (!textContent?.text) {
    throw new Error(
      "MCP tool returned no text content."
    );
  }

  return textContent.text;
}

function getErrorStatus(
  error: unknown
): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error
  ) {
    const status =
      (error as {
        status?: unknown;
      }).status;

    return typeof status === "number"
      ? status
      : undefined;
  }

  return undefined;
}

function getErrorMessage(
  error: unknown
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    const message =
      (error as {
        message?: unknown;
      }).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return String(error);
}

function isDailyQuotaError(
  error: unknown
): boolean {
  const serialized =
    JSON.stringify(error ?? {})
      .toLowerCase();

  const message =
    getErrorMessage(error).toLowerCase();

  return (
    serialized.includes(
      "generaterequestsperdayperproject"
    ) ||
    serialized.includes(
      "daily quota"
    ) ||
    (
      serialized.includes(
        "quota exceeded"
      ) &&
      serialized.includes(
        "perday"
      )
    ) ||
    message.includes(
      "daily quota"
    )
  );
}

function calculateRetryDelay(
  attempt: number,
  retryBaseDelay: number
): number {
  return (
    retryBaseDelay *
    Math.pow(2, attempt - 1)
  );
}

/**
 * Call Gemini with retry handling for
 * temporary failures.
 *
 * Production defaults come from config.ts.
 * Tests can override retry behavior through
 * the optional fifth argument.
 */
export async function generateGeminiContent(
  ai: GoogleGenAI,
  model: string,
  contents: any[],
  requestConfig?: any,
  options?: {
    maxRetries?: number;
    retryBaseDelay?: number;
  }
) {
  const maxRetries =
    options?.maxRetries ??
    config.geminiMaxRetries;

  const retryBaseDelay =
    options?.retryBaseDelay ??
    config.geminiRetryBaseDelay;

  let attempt = 0;

  while (true) {
    try {
      return await ai.models.generateContent({
        model,
        contents,
        config: requestConfig,
      });
    } catch (error: unknown) {
      const status =
        getErrorStatus(error);

      const isDailyQuota =
        isDailyQuotaError(error);

      const isRetryable =
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504;

      /*
       * Daily Gemini quota errors must never
       * be retried. Retrying a daily quota error
       * only wastes requests and cannot recover
       * until the quota resets.
       */
      if (isDailyQuota) {
        throw new Error(
          "Gemini daily quota exceeded. " +
          "The configured Gemini API project has reached its daily request limit. " +
          "Wait for the quota to reset or switch to another Gemini API project/model."
        );
      }

      /*
       * Do not retry non-transient errors.
       */
      if (!isRetryable) {
        throw error;
      }

      /*
       * Stop once the configured retry count
       * has been exhausted.
       */
      if (attempt >= maxRetries) {
        throw error;
      }

      attempt++;

      const delay =
        calculateRetryDelay(
          attempt,
          retryBaseDelay
        );

      logger.debug(
        `Gemini request failed (${status}). ` +
        `Retrying in ${delay}ms... ` +
        `Attempt ${attempt}/${maxRetries}`
      );

      await new Promise<void>(
        (resolve) => {
          setTimeout(resolve, delay);
        }
      );
    }
  }
}

export async function runAgent({
  client,
  ai,
  tools,
  model,
  userRequest,
  phase,
}: AgentOptions): Promise<AgentResult> {
  const availableTools =
    phase === "duplicate_check"
      ? tools.filter(
          (tool) =>
            tool.name ===
            "check_duplicate_issue"
        )
      : phase === "generate"
        ? tools.filter(
            (tool) =>
              tool.name ===
                "generate_issue" ||
              tool.name ===
                "list_github_labels"
          )
        : tools;

  logger.debug(
    `Agent phase: ${phase ?? "default"}`
  );

  logger.debug(
    "Available tools:",
    availableTools.map(
      (tool) => tool.name
    )
  );

  const geminiTools = [
    {
      functionDeclarations:
        availableTools.map(
          (tool) => ({
            name: tool.name,
            description:
              tool.description ?? "",
            parameters:
              tool.inputSchema,
          })
        ),
    },
  ];

  const contents: any[] = [
    {
      role: "user",
      parts: [
        {
          text: userRequest,
        },
      ],
    },
  ];

  let iteration = 0;

  const MAX_ITERATIONS = 10;

  while (
    iteration <
    MAX_ITERATIONS
  ) {
    iteration++;

    logger.debug(
      `========== AGENT ITERATION ${iteration} ==========`
    );

    logger.debug(
      "Sending request to Gemini..."
    );

    const response =
      await generateGeminiContent(
        ai,
        model,
        contents,
        {
          tools: geminiTools,
        }
      );

    const candidate =
      response.candidates?.[0];

    if (!candidate) {
      throw new Error(
        "Gemini returned no candidates."
      );
    }

    const functionCalls =
      response.functionCalls ?? [];

    logger.debug(
      "Function calls:",
      functionCalls.length
    );

    /*
     * No tool call means Gemini
     * has finished.
     */
    if (
      functionCalls.length === 0
    ) {
      return {
        finalResponse:
          response.text ?? "",
      };
    }

    /*
     * Preserve Gemini's
     * function-call message.
     */
    if (candidate.content) {
      contents.push(
        candidate.content
      );
    }

    const functionResponseParts:
      any[] = [];

    for (
      const functionCall of
        functionCalls
    ) {
      if (!functionCall.name) {
        continue;
      }

      const toolName =
        functionCall.name;

      const toolArgs =
        functionCall.args ?? {};

      logger.debug(
        `MCP Tool Call: ${toolName}`
      );

      logger.debug(
        "Arguments:",
        JSON.stringify(
          toolArgs,
          null,
          2
        )
      );

      const knownTool =
        availableTools.find(
          (tool) =>
            tool.name ===
            toolName
        );

      if (!knownTool) {
        throw new Error(
          `Gemini requested unavailable MCP tool: ${toolName}`
        );
      }

      /*
       * Never allow the autonomous
       * agent to execute a write
       * operation.
       */
      if (
        toolName ===
        "create_github_issue"
      ) {
        throw new Error(
          "create_github_issue must be executed only after explicit user approval."
        );
      }

      const result =
        await client.callTool({
          name: toolName,
          arguments: toolArgs,
        });

      logger.debug(
        "MCP Tool Result:",
        JSON.stringify(
          result,
          null,
          2
        )
      );

      /*
       * PHASE 1:
       * Duplicate candidate retrieval.
       */
      if (
        phase ===
          "duplicate_check" &&
        toolName ===
          "check_duplicate_issue"
      ) {
        const text =
          extractTextContent(
            result
          );

        let duplicateResult:
          | AgentResult["duplicateResult"]
          | undefined;

        try {
          duplicateResult =
            JSON.parse(text);
        } catch {
          throw new Error(
            "check_duplicate_issue returned invalid JSON."
          );
        }

        if (!duplicateResult) {
          throw new Error(
            "Duplicate checker returned no result."
          );
        }

        return {
          finalResponse: "",
          duplicateResult,
        };
      }

      /*
       * PHASE 3:
       * Issue generation.
       */
      if (
        phase === "generate" &&
        toolName ===
          "generate_issue"
      ) {
        const text =
          extractTextContent(
            result
          );

        try {
          const proposedIssue =
            JSON.parse(text);

          return {
            finalResponse: "",
            proposedIssue,
          };
        } catch {
          throw new Error(
            "generate_issue returned invalid JSON."
          );
        }
      }

      /*
       * Normal tool response.
       */
      functionResponseParts.push({
        functionResponse: {
          name: toolName,
          response: {
            result,
          },
        },
      });
    }

    /*
     * Send tool results back
     * to Gemini.
     */
    contents.push({
      role: "user",
      parts:
        functionResponseParts,
    });
  }

  throw new Error(
    `Agent exceeded maximum iterations (${MAX_ITERATIONS}).`
  );
}

export async function analyzeDuplicates(
  ai: GoogleGenAI,
  model: string,
  description: string,
  candidates: NonNullable<
    AgentResult["duplicateResult"]
  >["candidates"]
) {
  const response =
    await generateGeminiContent(
      ai,
      model,
      [
        {
          role: "user",
          parts: [
            {
              text: `
You are analyzing GitHub issues for semantic duplicates.

Proposed issue:

${description}

Candidate issues:

${JSON.stringify(
  candidates,
  null,
  2
)}

Determine whether any candidate describes
substantially the same underlying problem.

Return ONLY valid JSON:

{
  "isDuplicate": true,
  "duplicateIssue": {
    "number": 123,
    "title": "...",
    "url": "..."
  },
  "reason": "..."
}

If there is no duplicate:

{
  "isDuplicate": false,
  "duplicateIssue": null,
  "reason": "..."
}
`,
            },
          ],
        },
      ],
      {}
    );

  let text =
    response.text?.trim() ?? "";

  /*
   * Gemini normally returns JSON,
   * but tolerate markdown fences.
   */
  if (
    text.startsWith("```")
  ) {
    text = text
      .replace(
        /^```json\s*/i,
        ""
      )
      .replace(
        /^```\s*/,
        ""
      )
      .replace(
        /\s*```$/,
        ""
      )
      .trim();
  }

  try {
    return JSON.parse(text) as {
      isDuplicate: boolean;
      duplicateIssue: {
        number: number;
        title: string;
        url: string;
      } | null;
      reason: string;
    };
  } catch {
    throw new Error(
      `Gemini returned invalid duplicate analysis JSON:\n${text}`
    );
  }
}