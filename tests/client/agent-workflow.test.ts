import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  runAgent,
} from "../../src/client/agent.js";

describe("Agent workflow", () => {
  function createMockClient() {
    return {
      callTool: vi.fn(),
    } as any;
  }

  function createMockAI(
    responses: any[]
  ) {
    let index = 0;

    return {
      models: {
        generateContent: vi.fn(
          async () => {
            const response =
              responses[index];

            index++;

            return response;
          }
        ),
      },
    } as any;
  }

  const duplicateTool = {
    name: "check_duplicate_issue",
    description:
      "Find possible duplicate issues",
    inputSchema: {
      type: "object",
    },
  };

  const generateTool = {
    name: "generate_issue",
    description:
      "Generate a structured issue",
    inputSchema: {
      type: "object",
    },
  };

  const labelsTool = {
    name: "list_github_labels",
    description:
      "List repository labels",
    inputSchema: {
      type: "object",
    },
  };

  const createTool = {
    name: "create_github_issue",
    description:
      "Create a GitHub issue",
    inputSchema: {
      type: "object",
    },
  };

  it("retrieves duplicate candidates during duplicate-check phase", async () => {
    const client =
      createMockClient();

    client.callTool.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            candidates: [
              {
                number: 12,
                title:
                  "Existing bug",
                body:
                  "Same problem",
                url:
                  "https://github.com/test/repo/issues/12",
                similarity: 0.8,
              },
            ],
          }),
        },
      ],
    });

    const ai =
      createMockAI([
        {
          candidates: [
            {
              content: {
                role: "model",
                parts: [
                  {
                    functionCall: {
                      name:
                        "check_duplicate_issue",
                      args: {
                        owner: "test",
                        repo: "repo",
                        description:
                          "Something is broken",
                      },
                    },
                  },
                ],
              },
            },
          ],
          functionCalls: [
            {
              name:
                "check_duplicate_issue",
              args: {
                owner: "test",
                repo: "repo",
                description:
                  "Something is broken",
              },
            },
          ],
        },
      ]);

    const result =
      await runAgent({
        client,
        ai,
        tools: [
          duplicateTool,
          generateTool,
          labelsTool,
        ],
        model: "test-model",
        phase:
          "duplicate_check",
        userRequest:
          "Check for duplicates.",
      });

    expect(
      result.duplicateResult
    ).toEqual({
      candidates: [
        {
          number: 12,
          title:
            "Existing bug",
          body:
            "Same problem",
          url:
            "https://github.com/test/repo/issues/12",
          similarity: 0.8,
        },
      ],
    });

    expect(
      client.callTool
    ).toHaveBeenCalledTimes(1);

    expect(
      client.callTool
    ).toHaveBeenCalledWith({
      name:
        "check_duplicate_issue",
      arguments: {
        owner: "test",
        repo: "repo",
        description:
          "Something is broken",
      },
    });
  });

  it("only exposes duplicate checker during duplicate phase", async () => {
    const client =
      createMockClient();

    client.callTool.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            candidates: [],
          }),
        },
      ],
    });

    const ai =
      createMockAI([
        {
          candidates: [
            {
              content: {
                role: "model",
                parts: [],
              },
            },
          ],
          functionCalls: [
            {
              name:
                "check_duplicate_issue",
              args: {},
            },
          ],
        },
      ]);

    await runAgent({
      client,
      ai,
      tools: [
        duplicateTool,
        generateTool,
        labelsTool,
        createTool,
      ],
      model: "test-model",
      phase:
        "duplicate_check",
      userRequest:
        "Check duplicates.",
    });

    const config =
      ai.models.generateContent
        .mock.calls[0][0];

    const declarations =
      config.config.tools[0]
        .functionDeclarations;

    expect(
      declarations.map(
        (tool: any) =>
          tool.name
      )
    ).toEqual([
      "check_duplicate_issue",
    ]);
  });

  it("generates an issue during generate phase", async () => {
    const client =
      createMockClient();

    client.callTool.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            title:
              "Bug: Login fails",
            body:
              "Login fails with valid credentials.",
            labels: ["bug"],
          }),
        },
      ],
    });

    const ai =
      createMockAI([
        {
          candidates: [
            {
              content: {
                role: "model",
                parts: [],
              },
            },
          ],
          functionCalls: [
            {
              name:
                "generate_issue",
              args: {
                description:
                  "Login fails",
                type: "bug",
              },
            },
          ],
        },
      ]);

    const result =
      await runAgent({
        client,
        ai,
        tools: [
          duplicateTool,
          generateTool,
          labelsTool,
        ],
        model: "test-model",
        phase: "generate",
        userRequest:
          "Generate a bug issue.",
      });

    expect(
      result.proposedIssue
    ).toEqual({
      title:
        "Bug: Login fails",
      body:
        "Login fails with valid credentials.",
      labels: ["bug"],
    });

    expect(
      client.callTool
    ).toHaveBeenCalledWith({
      name:
        "generate_issue",
      arguments: {
        description:
          "Login fails",
        type: "bug",
      },
    });
  });

  it("allows label lookup during generate phase", async () => {
    const client =
      createMockClient();

    client.callTool
      .mockResolvedValueOnce({
        content: [
          {
            type: "text",
            text: JSON.stringify([
              {
                name: "bug",
                description:
                  "Something is broken",
                color: "d73a4a",
              },
            ]),
          },
        ],
      })
      .mockResolvedValueOnce({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              title:
                "Bug: Login fails",
              body:
                "Login fails.",
              labels: ["bug"],
            }),
          },
        ],
      });

    const ai =
      createMockAI([
        {
          candidates: [
            {
              content: {
                role: "model",
                parts: [],
              },
            },
          ],
          functionCalls: [
            {
              name:
                "list_github_labels",
              args: {
                owner: "test",
                repo: "repo",
              },
            },
          ],
        },
        {
          candidates: [
            {
              content: {
                role: "model",
                parts: [],
              },
            },
          ],
          functionCalls: [
            {
              name:
                "generate_issue",
              args: {
                description:
                  "Login fails",
                type: "bug",
              },
            },
          ],
        },
      ]);

    const result =
      await runAgent({
        client,
        ai,
        tools: [
          duplicateTool,
          generateTool,
          labelsTool,
        ],
        model: "test-model",
        phase: "generate",
        userRequest:
          "Generate a bug issue.",
      });

    expect(
      result.proposedIssue
    ).toBeDefined();

    expect(
      client.callTool
    ).toHaveBeenCalledTimes(2);

    expect(
      client.callTool
    ).toHaveBeenNthCalledWith(
      1,
      {
        name:
          "list_github_labels",
        arguments: {
          owner: "test",
          repo: "repo",
        },
      }
    );

    expect(
      client.callTool
    ).toHaveBeenNthCalledWith(
      2,
      {
        name:
          "generate_issue",
        arguments: {
          description:
            "Login fails",
          type: "bug",
        },
      }
    );
  });

  it("rejects create_github_issue from the autonomous agent", async () => {
    const client =
      createMockClient();

    const ai =
      createMockAI([
        {
          candidates: [
            {
              content: {
                role: "model",
                parts: [],
              },
            },
          ],
          functionCalls: [
            {
              name:
                "create_github_issue",
              args: {
                owner: "test",
                repo: "repo",
                title:
                  "Unauthorized issue",
                body:
                  "Should never be created.",
              },
            },
          ],
        },
      ]);

    await expect(
      runAgent({
        client,
        ai,
        tools: [
          generateTool,
          createTool,
        ],
        model: "test-model",
        phase: "generate",
        userRequest:
          "Create an issue.",
      })
    ).rejects.toThrow(
      "Gemini requested unavailable MCP tool"
    );

    expect(
      client.callTool
    ).not.toHaveBeenCalled();
  });

  it("rejects malformed generate_issue JSON", async () => {
    const client =
      createMockClient();

    client.callTool.mockResolvedValue({
      content: [
        {
          type: "text",
          text: "this is not json",
        },
      ],
    });

    const ai =
      createMockAI([
        {
          candidates: [
            {
              content: {
                role: "model",
                parts: [],
              },
            },
          ],
          functionCalls: [
            {
              name:
                "generate_issue",
              args: {
                description:
                  "Broken login",
                type: "bug",
              },
            },
          ],
        },
      ]);

    await expect(
      runAgent({
        client,
        ai,
        tools: [generateTool],
        model: "test-model",
        phase: "generate",
        userRequest:
          "Generate issue.",
      })
    ).rejects.toThrow(
      "generate_issue returned invalid JSON"
    );
  });

  it("rejects malformed duplicate-check JSON", async () => {
    const client =
      createMockClient();

    client.callTool.mockResolvedValue({
      content: [
        {
          type: "text",
          text: "not valid json",
        },
      ],
    });

    const ai =
      createMockAI([
        {
          candidates: [
            {
              content: {
                role: "model",
                parts: [],
              },
            },
          ],
          functionCalls: [
            {
              name:
                "check_duplicate_issue",
              args: {},
            },
          ],
        },
      ]);

    await expect(
      runAgent({
        client,
        ai,
        tools: [
          duplicateTool,
        ],
        model: "test-model",
        phase:
          "duplicate_check",
        userRequest:
          "Check duplicates.",
      })
    ).rejects.toThrow(
      "check_duplicate_issue returned invalid JSON"
    );
  });
});