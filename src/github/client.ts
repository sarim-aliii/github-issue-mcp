const GITHUB_API = "https://api.github.com";

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error(
      "GITHUB_TOKEN environment variable is not configured"
    );
  }

  return token;
}

export async function githubRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const response = await fetch(
    `${GITHUB_API}${endpoint}`,
    {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2026-03-10",
        "Content-Type": "application/json",
        ...options.headers,
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `GitHub API error ${response.status}: ${errorBody}`
    );
  }

  return response.json() as Promise<T>;
}