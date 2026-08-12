export type IssueType = "bug" | "feature" | "task";

export interface GeneratedIssue {
  title: string;
  body: string;
  labels: string[];
}