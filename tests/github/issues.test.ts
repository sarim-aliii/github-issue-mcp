import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  listGitHubIssues,
  listGitHubLabels,
  createGitHubIssue,
  validateGitHubLabels,
} from "../../src/github/issues.js";

describe("GitHub API functions", () => {
  beforeEach(() => {
    process.env.GITHUB_TOKEN =
      "test-token";
  });

  afterEach(() => {
    delete process.env.GITHUB_TOKEN;
    vi.restoreAllMocks();
  });

  it("lists open GitHub issues and filters pull requests", async () => {
    const mockIssues = [
      {
        number: 10,
        title:
          "Export button does nothing",
        body:
          "The export button is broken.",
        html_url:
          "https://github.com/test/repo/issues/10",
        state: "open",
      },
      {
        number: 11,
        title: "Add dark mode",
        body:
          "Dark mode is required.",
        html_url:
          "https://github.com/test/repo/issues/11",
        state: "open",
        pull_request: {
          url:
            "https://api.github.com/pulls/11",
        },
      },
    ];

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify(mockIssues),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        )
      );

    const issues =
      await listGitHubIssues(
        "test-owner",
        "test-repo"
      );

    expect(issues).toEqual([
      {
        number: 10,
        title:
          "Export button does nothing",
        body:
          "The export button is broken.",
        html_url:
          "https://github.com/test/repo/issues/10",
        state: "open",
      },
    ]);

    expect(
      fetchMock
    ).toHaveBeenCalledTimes(1);

    const [url, options] =
      fetchMock.mock.calls[0];

    expect(url).toBe(
      "https://api.github.com/repos/test-owner/test-repo/issues?state=open&per_page=100&page=1"
    );

    expect(
      (options as RequestInit).method
    ).toBeUndefined();
  });

  it("lists GitHub labels", async () => {
    const mockLabels = [
      {
        name: "bug",
        description:
          "Something isn't working",
        color: "d73a4a",
      },
      {
        name: "enhancement",
        description:
          "New feature or request",
        color: "a2eeef",
      },
    ];

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify(mockLabels),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        )
      );

    const labels =
      await listGitHubLabels(
        "test-owner",
        "test-repo"
      );

    expect(labels).toEqual(
      mockLabels
    );

    expect(
      fetchMock
    ).toHaveBeenCalledTimes(1);

    const [url] =
      fetchMock.mock.calls[0];

    expect(url).toBe(
      "https://api.github.com/repos/test-owner/test-repo/labels?per_page=100"
    );
  });

  it("validates existing GitHub labels", async () => {
    const mockLabels = [
      {
        name: "bug",
        description:
          "Something isn't working",
        color: "d73a4a",
      },
      {
        name: "enhancement",
        description:
          "New feature or request",
        color: "a2eeef",
      },
    ];

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify(mockLabels),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        )
      );

    const result =
      await validateGitHubLabels(
        "test-owner",
        "test-repo",
        ["bug", "enhancement"]
      );

    expect(result).toEqual([
      "bug",
      "enhancement",
    ]);
  });

  it("returns empty labels without calling GitHub", async () => {
    const fetchMock =
      vi.spyOn(
        globalThis,
        "fetch"
      );

    const result =
      await validateGitHubLabels(
        "test-owner",
        "test-repo",
        []
      );

    expect(result).toEqual([]);

    expect(
      fetchMock
    ).not.toHaveBeenCalled();
  });

  it("rejects invalid GitHub labels", async () => {
    const mockLabels = [
      {
        name: "bug",
        description:
          "Something isn't working",
        color: "d73a4a",
      },
    ];

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify(mockLabels),
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        )
      );

    await expect(
      validateGitHubLabels(
        "test-owner",
        "test-repo",
        [
          "bug",
          "not-a-real-label",
        ]
      )
    ).rejects.toThrow(
      "Invalid GitHub label(s): not-a-real-label"
    );
  });

  it("creates a GitHub issue with validated labels", async () => {
    const mockLabels = [
      {
        name: "bug",
        description:
          "Something isn't working",
        color: "d73a4a",
      },
    ];

    const mockIssue = {
      number: 11,
      title:
        "Bug: Export button does nothing",
      body:
        "The export button does nothing.",
      html_url:
        "https://github.com/test/repo/issues/11",
      state: "open",
    };

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(
        async (
          input: RequestInfo | URL,
          init?: RequestInit
        ) => {
          const url = String(input);

          /*
           * First request:
           * retrieve repository labels.
           */
          if (
            url.includes("/labels?")
          ) {
            return new Response(
              JSON.stringify(
                mockLabels
              ),
              {
                status: 200,
                headers: {
                  "Content-Type":
                    "application/json",
                },
              }
            );
          }

          /*
           * Second request:
           * create the GitHub issue.
           */
          if (
            url.includes("/issues") &&
            init?.method === "POST"
          ) {
            return new Response(
              JSON.stringify(
                mockIssue
              ),
              {
                status: 201,
                headers: {
                  "Content-Type":
                    "application/json",
                },
              }
            );
          }

          return new Response(
            JSON.stringify({
              message:
                "Unexpected request",
            }),
            {
              status: 500,
              headers: {
                "Content-Type":
                  "application/json",
              },
            }
          );
        }
      );

    const issue =
      await createGitHubIssue(
        "test-owner",
        "test-repo",
        "Bug: Export button does nothing",
        "The export button does nothing.",
        ["bug"]
      );

    expect(issue).toEqual(
      mockIssue
    );

    /*
     * One request for labels +
     * one request for issue creation.
     */
    expect(
      fetchMock
    ).toHaveBeenCalledTimes(2);

    const calls =
      fetchMock.mock.calls;

    const labelsRequest =
      calls.find(([url]) =>
        String(url).includes(
          "/labels?"
        )
      );

    expect(
      labelsRequest
    ).toBeDefined();

    const createRequest =
      calls.find(
        ([url, options]) =>
          String(url).includes(
            "/issues"
          ) &&
          (options as RequestInit)
            ?.method === "POST"
      );

    expect(
      createRequest
    ).toBeDefined();

    const [
      createUrl,
      createOptions,
    ] = createRequest!;

    expect(createUrl).toBe(
      "https://api.github.com/repos/test-owner/test-repo/issues"
    );

    expect(
      (createOptions as RequestInit)
        .method
    ).toBe("POST");

    expect(
      JSON.parse(
        (createOptions as RequestInit)
          .body as string
      )
    ).toEqual({
      title:
        "Bug: Export button does nothing",
      body:
        "The export button does nothing.",
      labels: ["bug"],
    });
  });

  it("throws a useful error when GitHub returns an error", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            message:
              "Not Found",
          }),
          {
            status: 404,
            headers: {
              "Content-Type":
                "application/json",
            },
          }
        )
      );

    await expect(
      listGitHubIssues(
        "invalid-owner",
        "invalid-repo"
      )
    ).rejects.toThrow(
      "GitHub API error 404"
    );
  });
});