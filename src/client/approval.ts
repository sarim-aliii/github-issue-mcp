import { confirm } from "@inquirer/prompts";

export interface ProposedIssue {
  title: string;
  body: string;
  labels: string[];
}

export async function requestIssueApproval(
  issue: ProposedIssue
): Promise<boolean> {
  console.error("\n================================");
  console.error("PROPOSED GITHUB ISSUE");
  console.error("================================\n");

  console.error(`Title:\n${issue.title}\n`);

  console.error(
    `Labels:\n${
      issue.labels.length > 0
        ? issue.labels.join(", ")
        : "None"
    }\n`
  );

  console.error(`Body:\n${issue.body}\n`);

  return confirm({
    message: "Create this issue on GitHub?",
    default: false,
  });
}