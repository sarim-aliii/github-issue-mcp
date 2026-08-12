import { describe, expect, it } from "vitest";

import { generateIssue } from "../../src/tools/generate-issue.js";

describe("generateIssue", () => {
  it("generates a bug issue with all provided details", () => {
    const issue = generateIssue({
      description:
        "The export button does nothing.",

      type: "bug",

      reproductionSteps:
        "Open reports and click Export.",

      expectedBehavior:
        "The report should download.",

      actualBehavior:
        "Nothing happens.",

      environment:
        "Chrome 126 on Windows 11",

      additionalContext:
        "The issue happens consistently.",
    });

    expect(issue.title).toBe(
      "Bug: The export button does nothing."
    );

    expect(issue.labels).toEqual(["bug"]);

    expect(issue.body).toContain(
      "The export button does nothing."
    );

    expect(issue.body).toContain(
      "Open reports and click Export."
    );

    expect(issue.body).toContain(
      "The report should download."
    );

    expect(issue.body).toContain(
      "Nothing happens."
    );

    expect(issue.body).toContain(
      "Chrome 126 on Windows 11"
    );

    expect(issue.body).toContain(
      "The issue happens consistently."
    );
  });

  it("uses fallback placeholders when optional details are missing", () => {
    const issue = generateIssue({
      description:
        "The export button does nothing.",

      type: "bug",
    });

    expect(issue.title).toBe(
      "Bug: The export button does nothing."
    );

    expect(issue.labels).toEqual(["bug"]);

    expect(issue.body).toContain(
      "<!-- Add reproduction steps -->"
    );

    expect(issue.body).toContain(
      "<!-- What should happen? -->"
    );

    expect(issue.body).toContain(
      "<!-- What currently happens? -->"
    );

    expect(issue.body).toContain(
      "<!-- Browser, OS, application version, etc. -->"
    );

    expect(issue.body).toContain(
      "<!-- Add logs, screenshots, related information, etc. -->"
    );
  });
});