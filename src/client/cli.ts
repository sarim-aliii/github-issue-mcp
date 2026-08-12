import {
  input,
  confirm,
} from "@inquirer/prompts";

export async function getIssueDescription(): Promise<string> {
  console.error("\n================================");
  console.error("   GitHub Issue MCP Assistant");
  console.error("================================\n");

  console.error(
    `Repository: ${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}\n`
  );

  const description = await input({
    message: "Describe your issue:",
    validate: (value) => {
      if (!value.trim()) {
        return "Please provide an issue description.";
      }

      if (value.trim().length < 10) {
        return "Please provide a little more detail.";
      }

      return true;
    },
  });

  return description.trim();
}

export async function confirmIssueCreation(): Promise<boolean> {
  return confirm({
    message: "Create this issue on GitHub?",
    default: false,
  });
}