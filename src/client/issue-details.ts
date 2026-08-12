import { input } from "@inquirer/prompts";

export interface IssueDetails {
  description: string;
  reproductionSteps: string;
  expectedBehavior: string;
  actualBehavior: string;
  environment: string;
  additionalContext: string;
}

export async function gatherIssueDetails(
  initialDescription: string
): Promise<IssueDetails> {
  console.error("\n================================");
  console.error("   ADDITIONAL ISSUE DETAILS");
  console.error("================================\n");

  console.error(
    "A few details will help create a better GitHub issue.\n"
  );

  const reproductionSteps = await input({
    message: "How can this issue be reproduced?",
    default: "",
  });

  const expectedBehavior = await input({
    message: "What should happen instead?",
    default: "",
  });

  const actualBehavior = await input({
    message: "What actually happens?",
    default: "",
  });

  const environment = await input({
    message: "Environment/version (optional):",
    default: "",
  });

  const additionalContext = await input({
    message: "Additional context (optional):",
    default: "",
  });

  return {
    description: initialDescription.trim(),

    reproductionSteps:
      reproductionSteps.trim(),

    expectedBehavior:
      expectedBehavior.trim(),

    actualBehavior:
      actualBehavior.trim(),

    environment:
      environment.trim(),

    additionalContext:
      additionalContext.trim(),
  };
}