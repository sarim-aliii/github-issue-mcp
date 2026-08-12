import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

describe("client configuration", () => {
  afterEach(() => {
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_MAX_RETRIES;
    delete process.env.GEMINI_RETRY_BASE_DELAY;
    delete process.env.DEBUG;
  });

  it("uses sensible defaults", async () => {
    vi.resetModules();

    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_MAX_RETRIES;
    delete process.env.GEMINI_RETRY_BASE_DELAY;
    delete process.env.DEBUG;

    const { config } = await import(
      "../../src/client/config.js"
    );

    expect(
      config.geminiModel
    ).toBe("gemini-3.6-flash");

    expect(
      config.geminiMaxRetries
    ).toBe(3);

    expect(
      config.geminiRetryBaseDelay
    ).toBe(1000);

    expect(
      config.debug
    ).toBe(false);
  });

  it("reads Gemini configuration from environment variables", async () => {
    vi.resetModules();

    process.env.GEMINI_MODEL =
      "test-model";

    process.env.GEMINI_MAX_RETRIES =
      "5";

    process.env.GEMINI_RETRY_BASE_DELAY =
      "250";

    process.env.DEBUG =
      "true";

    const { config } = await import(
      "../../src/client/config.js"
    );

    expect(
      config.geminiModel
    ).toBe("test-model");

    expect(
      config.geminiMaxRetries
    ).toBe(5);

    expect(
      config.geminiRetryBaseDelay
    ).toBe(250);

    expect(
      config.debug
    ).toBe(true);
  });
});