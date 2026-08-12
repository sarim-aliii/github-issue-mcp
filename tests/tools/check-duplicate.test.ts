import {
  describe,
  expect,
  it,
} from "vitest";

import {
  normalizeText,
  getWords,
  calculateSimilarity,
} from "../../src/tools/check-duplicate.js";

describe("duplicate detection utilities", () => {
  it("normalizes text consistently", () => {
    expect(
      normalizeText(
        "Login PAGE!!!   Crashes when OTP is invalid."
      )
    ).toBe(
      "login page crashes when otp is invalid"
    );
  });

  it("extracts meaningful words", () => {
    const words = getWords(
      "The login page crashes when OTP is invalid"
    );

    expect(words.has("login")).toBe(true);
    expect(words.has("page")).toBe(true);
    expect(words.has("crashes")).toBe(true);
    expect(words.has("invalid")).toBe(true);

    // Words of length <= 2 are ignored.
    expect(words.has("is")).toBe(false);
  });

  it("returns high similarity for similar issues", () => {
    const similarity =
      calculateSimilarity(
        "The login page crashes when OTP is invalid",
        "Login page crashes when an invalid OTP is entered"
      );

    expect(similarity).toBeGreaterThan(0.25);
  });

  it("returns low similarity for unrelated issues", () => {
    const similarity =
      calculateSimilarity(
        "The export button does nothing",
        "The password reset email never arrives"
      );

    expect(similarity).toBeLessThan(0.25);
  });

  it("returns zero when there are no meaningful words", () => {
    const similarity =
      calculateSimilarity(
        "a b c",
        "x y z"
      );

    expect(similarity).toBe(0);
  });

  it("is identical when comparing the same text", () => {
    const similarity =
      calculateSimilarity(
        "The export button does nothing",
        "The export button does nothing"
      );

    expect(similarity).toBe(1);
  });
});