import "dotenv/config";

function getPositiveInteger(
  value: string | undefined,
  fallback: number
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed < 0
  ) {
    return fallback;
  }

  return parsed;
}

function getBoolean(
  value: string | undefined,
  fallback: boolean
): boolean {
  if (!value) {
    return fallback;
  }

  return (
    value.toLowerCase() === "true" ||
    value === "1"
  );
}

export const config = {
  geminiModel:
    process.env.GEMINI_MODEL ??
    "gemini-3.6-flash",

  geminiMaxRetries:
    getPositiveInteger(
      process.env.GEMINI_MAX_RETRIES,
      3
    ),

  geminiRetryBaseDelay:
    getPositiveInteger(
      process.env.GEMINI_RETRY_BASE_DELAY,
      1000
    ),

  debug: getBoolean(
    process.env.DEBUG,
    false
  ),

  githubOwner:
    process.env.GITHUB_OWNER,

  githubRepo:
    process.env.GITHUB_REPO,
};