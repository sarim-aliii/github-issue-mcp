# GitHub Issue MCP Assistant

[![CI](https://github.com/sarim-aliii/github-issue-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/sarim-aliii/github-issue-mcp/actions/workflows/ci.yml)

An AI-powered GitHub issue management assistant built with **Model Context Protocol (MCP)**, **Google Gemini**, **TypeScript**, and the **GitHub REST API**.

The assistant turns a short natural-language bug report into a structured GitHub issue while intelligently checking for existing duplicates before creating anything.

The project demonstrates a controlled **agentic workflow** where Gemini can reason and use MCP tools, while persistent GitHub write operations remain explicitly controlled by the application and the user.

---

## ✨ Features

- 🤖 **AI-powered issue generation** using Google Gemini
- 🔍 **Duplicate issue detection**
- 🧠 **Semantic duplicate analysis** instead of relying only on keyword matching
- 📝 Interactive collection of additional issue details
- 🏷️ Repository label retrieval and validation
- 👤 **Human approval before issue creation**
- 🔐 Prevents the autonomous AI agent from directly creating GitHub issues
- 🔄 Automatic retry handling for temporary Gemini API failures
- 🚦 Daily Gemini quota detection without unnecessary retries
- ⚙️ Configurable Gemini model and retry behavior
- 🧪 Comprehensive unit, workflow, and integration tests
- 📦 MCP-based architecture with reusable GitHub tools
- 🛡️ Phase-restricted AI tool access
- 🔌 Separation between AI reasoning and external GitHub operations

---

# 🏗️ Architecture

```text
                         ┌──────────────────┐
                         │      User        │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │    CLI Client    │
                         └────────┬─────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │     MCP Client/Server    │
                    └────────────┬─────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
                ▼                                 ▼
       ┌──────────────────┐              ┌──────────────────┐
       │    Phase 1       │              │    Phase 3       │
       │ Duplicate Check  │              │ Issue Generation │
       └────────┬─────────┘              └────────┬─────────┘
                │                                 │
                ▼                                 ▼
       ┌──────────────────┐              ┌──────────────────┐
       │ check_duplicate  │              │ generate_issue   │
       │      _issue      │              │ list_github_     │
       └────────┬─────────┘              │ labels           │
                │                        └────────┬─────────┘
                ▼                                 │
       Candidate Issues                            │
                │                                 │
                ▼                                 ▼
       ┌──────────────────┐              Proposed Issue
       │ Gemini Semantic  │                     │
       │    Analysis      │                     ▼
       └────────┬─────────┘              ┌──────────────────┐
                │                        │ Human Approval   │
                ▼                        └────────┬─────────┘
          Duplicate?                              │
           /      \                               │
         Yes       No                             │
          │         │                             │
          ▼         ▼                             │
         Stop   Gather Details                    │
                    │                             │
                    ▼                             │
             Generate Issue                       │
                    │                             │
                    └──────────────┬──────────────┘
                                   │
                              Approved?
                              /       \
                            No         Yes
                            │           │
                            ▼           ▼
                           Stop   ┌──────────────────┐
                                  │    Phase 5       │
                                  │ Create GitHub    │
                                  │      Issue       │
                                  └──────────────────┘


🔑 Core Design Principle

The most important architectural decision is that:

Gemini does not have autonomous access to the GitHub write operation.

The workflow is intentionally divided into controlled phases.

Phase 1
Duplicate Detection
        │
        ▼
Semantic Analysis
        │
        ▼
Phase 2
Collect Details
        │
        ▼
Phase 3
Issue Generation
        │
        ▼
Phase 4
Human Approval
        │
        ▼
Phase 5
GitHub Creation

This provides a clear human-in-the-loop safety boundary around persistent external side effects.

🔄 Workflow

The complete workflow is:

1. User describes an issue
          │
          ▼
2. Retrieve duplicate candidates
          │
          ▼
3. Gemini performs semantic analysis
          │
          ├──────── Duplicate ────────► Stop
          │
          ▼
4. Collect additional issue details
          │
          ▼
5. Gemini generates structured issue
          │
          ▼
6. Display proposed issue
          │
          ▼
7. Ask user for approval
          │
          ├──────── No ───────────────► Stop
          │
          ▼
8. Client creates GitHub issue

🧩 MCP Tools

The MCP server exposes the following tools:

Tool	Purpose
generate_issue	Generate a structured GitHub issue
create_github_issue	Create an issue on GitHub
list_github_issues	Retrieve open repository issues
list_github_labels	Retrieve repository labels
check_duplicate_issue	Find likely duplicate issue candidates
generate_issue

Generates a structured issue from the supplied information.

Inputs
description
type
reproductionSteps
expectedBehavior
actualBehavior
environment
additionalContext
Example output
{
  "title": "Bug: Login button does not work",
  "body": "## Description\n\nLogin button does not work...",
  "labels": ["bug"]
}
check_duplicate_issue

Retrieves likely duplicate candidates from the repository.

The tool performs inexpensive lexical candidate ranking against open issues.

The similarity score is not treated as proof of duplication.

Gemini performs the final semantic analysis.

list_github_issues

Retrieves open GitHub issues while filtering out pull requests.

list_github_labels

Retrieves labels available in the repository.

create_github_issue

Creates the final GitHub issue.

This tool is intentionally not exposed to the autonomous Gemini agent.

It is invoked directly by the client only after human approval.

🔍 Duplicate Detection

Duplicate detection is deliberately split into two stages.

Stage 1 — Candidate Retrieval

The MCP tool performs inexpensive lexical similarity/ranking against existing open issues.

For example:

User:

"The search results page crashes when I apply multiple filters."

                    │
                    ▼

       check_duplicate_issue

                    │
                    ▼

Candidate #8
"The search results page crashes
when I apply multiple filters."

Similarity: 0.21

The similarity score is only used to identify potentially relevant candidates.

It is not considered proof of duplication.

Stage 2 — Semantic Analysis

Gemini receives the candidate issues and determines whether any candidate describes the same underlying problem.

Example:

{
  "isDuplicate": true,
  "duplicateIssue": {
    "number": 8,
    "title": "Bug: The search results page crashes when I apply multiple filters.",
    "url": "https://github.com/example/repository/issues/8"
  },
  "reason": "The candidate describes the exact same underlying problem."
}

This prevents unrelated issues from being incorrectly classified as duplicates merely because they share common words such as:

login
page
button
crash
issue
🤖 Agent Workflow

The Gemini agent supports controlled multi-step tool execution.

The available MCP tools are restricted according to the current workflow phase.

Phase 1 — Duplicate Detection

Gemini receives only:

check_duplicate_issue

The agent can use this tool to retrieve candidate issues.

It cannot:

generate_issue
create_github_issue

during this phase.

Phase 3 — Issue Generation

Gemini receives:

list_github_labels
generate_issue

This allows the agent to inspect repository labels and generate the proposed issue.

It still cannot create the GitHub issue.

Phase 5 — Issue Creation

The autonomous Gemini agent does not receive:

create_github_issue

Instead, the application directly invokes the tool after explicit human approval.

🔐 Security Model

The project uses multiple layers to prevent unintended GitHub writes.

1. Phase-Based Tool Exposure

The available tools are restricted depending on the current phase.

Duplicate Phase
    │
    └── check_duplicate_issue

Generate Phase
    │
    ├── list_github_labels
    └── generate_issue

Creation Phase
    │
    └── create_github_issue
       (client-controlled)
2. Autonomous Write Protection

The Gemini agent cannot directly invoke:

create_github_issue

Even if the model attempts to request the tool, the agent workflow rejects the operation.

3. Human Approval

The proposed issue is displayed to the user before creation.

Example:

PROPOSED GITHUB ISSUE

Title:
Bug: Login button does not work with valid credentials.

Labels:
bug

Body:

## Description

Login button does not work with valid credentials.

## Steps to Reproduce

Open login page → enter valid credentials → click Login.

## Expected Behavior

User should be redirected to the dashboard.

## Actual Behavior

Nothing happens after clicking Login.

Create this issue on GitHub? [y/N]:

Only explicit approval proceeds to the GitHub write operation.

👤 Human-in-the-Loop Creation

Issue creation is intentionally controlled by the application.

The architecture is:

Gemini
   │
   ▼
Generate Proposed Issue
   │
   ▼
CLI Displays Issue
   │
   ▼
User Approval
   │
   ├── No ──► Stop
   │
   └── Yes
         │
         ▼
Client invokes create_github_issue
         │
         ▼
GitHub

Creating a GitHub issue is a persistent external side effect.

Therefore, the AI proposes the action while the user controls the final write operation.

🔄 Gemini Error Handling

The Gemini client includes retry handling for temporary API failures.

HTTP 429

The system distinguishes between temporary rate-limit errors and exhausted daily quotas.

Temporary 429 errors are retried according to the configured retry policy.

Daily quota exhaustion is detected separately and is not repeatedly retried, because additional requests cannot succeed until the quota resets or a different Gemini project/model is used.

HTTP 5xx

Temporary Gemini server-side failures are retried automatically.

Examples include:

500
502
503
504
Retry Configuration

Retry behavior can be configured through environment variables:

GEMINI_MAX_RETRIES=3
GEMINI_RETRY_BASE_DELAY=1000

The retry delay increases between attempts.

Invalid JSON

If an MCP tool expected to return JSON produces malformed output, the agent reports a clear error.

For example:

generate_issue returned invalid JSON.

or:

check_duplicate_issue returned invalid JSON.

This keeps failures localized and easier to diagnose.

⚙️ Configuration

The application supports environment-based configuration.

Example:

GITHUB_TOKEN=your_github_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repository

GEMINI_API_KEY=your_gemini_api_key

GEMINI_MODEL=gemini-3.6-flash
GEMINI_MAX_RETRIES=3
GEMINI_RETRY_BASE_DELAY=1000

DEBUG=false
Configuration options
Variable	Purpose	Default
GITHUB_TOKEN	GitHub API authentication	Required
GITHUB_OWNER	GitHub repository owner	Required
GITHUB_REPO	GitHub repository name	Required
GEMINI_API_KEY	Gemini API authentication	Required
GEMINI_MODEL	Gemini model	gemini-3.6-flash
GEMINI_MAX_RETRIES	Maximum Gemini retries	3
GEMINI_RETRY_BASE_DELAY	Base retry delay in milliseconds	1000
DEBUG	Enable debug behavior/logging	false

Never commit .env or API keys to Git.

🧪 Testing

The project uses Vitest for automated testing.

The test suite currently contains:

9 test files
43 tests
43 passing

The tests cover several layers of the application.

GitHub API Tests
tests/github/issues.test.ts

Validates:

GitHub issue retrieval
Pull-request filtering
Label retrieval
Label validation
Empty label handling
GitHub issue creation
GitHub API error handling
MCP Tool Tests
tests/tools/mcp-tools.test.ts

Validates:

MCP tool registration
MCP tool invocation
Tool argument handling
MCP error responses
Issue Generation Tests
tests/tools/generate-issue.test.ts

Validates:

Bug issue generation
Optional field handling
Fallback placeholders
Structured issue output
Duplicate Detection Tests
tests/tools/check-duplicate.test.ts

Validates:

Candidate retrieval
Similarity ranking
Candidate limiting
Duplicate detection behavior
Gemini Agent Tests
tests/client/agent.test.ts

Validates:

Gemini request handling
Temporary 429 retry behavior
Temporary 5xx retry behavior
Daily quota handling
Maximum retry behavior
Non-retryable errors
Agent Workflow Tests
tests/client/agent-workflow.test.ts

Validates:

Duplicate-check phase restrictions
Issue-generation phase restrictions
Label lookup
Structured issue generation
Autonomous creation protection
Malformed MCP responses
Workflow Tests
tests/client/workflow.test.ts

Validates:

Duplicate workflow termination
Successful issue generation and creation
Approval rejection
Missing generated issue handling
Configuration Tests
tests/client/config.test.ts

Validates:

Default Gemini configuration
Environment-variable configuration
MCP Integration Tests
tests/integration/mcp-server.test.ts

Validates:

MCP server startup
MCP connection behavior
MCP tool availability
Run Tests

Run the complete test suite:

npm test

Run TypeScript validation:

npm run typecheck

Expected result:

Test Files  9 passed (9)
Tests       43 passed (43)
📊 Test Coverage

The current suite validates:

✓ GitHub API interactions
✓ Issue listing
✓ Pull-request filtering
✓ Label retrieval
✓ Label validation
✓ Issue creation
✓ GitHub API error handling
✓ MCP tool registration
✓ MCP tool invocation
✓ Issue generation
✓ Duplicate candidate retrieval
✓ Lexical candidate ranking
✓ Semantic duplicate workflow
✓ Gemini retries
✓ Gemini 429 handling
✓ Gemini 5xx handling
✓ Gemini quota handling
✓ Malformed JSON handling
✓ Agent phase restrictions
✓ Human-controlled write boundary
✓ Workflow orchestration
✓ Approval handling
✓ MCP integration
✓ Configuration defaults
✓ Environment-based configuration
🛠️ Tech Stack
Language
TypeScript
Node.js
AI
Google Gemini
@google/genai
MCP
@modelcontextprotocol/sdk
Validation
Zod
CLI
Inquirer
Testing
Vitest
GitHub
GitHub REST API
📁 Project Structure
github-issue-mcp/
│
├── src/
│   ├── client/
│   │   ├── agent.ts
│   │   ├── ai-client.ts
│   │   ├── approval.ts
│   │   ├── cli.ts
│   │   ├── config.ts
│   │   ├── index.ts
│   │   ├── issue-details.ts
│   │   └── workflow.ts
│   │
│   ├── github/
│   │   ├── client.ts
│   │   └── issues.ts
│   │
│   ├── tools/
│   │   ├── check-duplicate.ts
│   │   ├── create-issue.ts
│   │   ├── generate-issue.ts
│   │   ├── list-issues.ts
│   │   └── list-labels.ts
│   │
│   ├── types/
│   │   └── issue.ts
│   │
│   └── index.ts
│
├── tests/
│   ├── client/
│   │   ├── agent.test.ts
│   │   ├── agent-workflow.test.ts
│   │   ├── config.test.ts
│   │   └── workflow.test.ts
│   │
│   ├── github/
│   │   └── issues.test.ts
│   │
│   ├── integration/
│   │   └── mcp-server.test.ts
│   │
│   └── tools/
│       ├── check-duplicate.test.ts
│       ├── generate-issue.test.ts
│       └── mcp-tools.test.ts
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
⚙️ Setup
1. Clone the repository
git clone https://github.com/sarim-aliii/github-issue-mcp.git

cd github-issue-mcp
2. Install dependencies
npm install
3. Configure environment variables

Create a .env file:

GITHUB_TOKEN=your_github_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repository

GEMINI_API_KEY=your_gemini_api_key

GEMINI_MODEL=gemini-3.6-flash
GEMINI_MAX_RETRIES=3
GEMINI_RETRY_BASE_DELAY=1000

DEBUG=false

Never commit .env to Git.

▶️ Running the Assistant

Start the CLI client with:

npx tsx src/client/index.ts

The assistant will ask for a short issue description:

✔ Describe your issue:
The export button on the reports page does nothing when clicked.

The assistant will then:

1. Connect to the MCP server
2. Discover available MCP tools
3. Search for possible duplicates
4. Analyze candidates semantically
5. Stop if a duplicate exists
6. Ask for additional details
7. Generate a structured issue
8. Display the proposed issue
9. Ask for human confirmation
10. Create the issue if approved
💡 Example
Input
The export button on the reports page does nothing when clicked.
Additional Information
Reproduction:

Open the reports page, select a report, and click Export.

Expected:

The selected report should be downloaded as a CSV file.

Actual:

Nothing happens after clicking Export.

Environment:

Chrome 126, Windows 11, App v2.4.1.

Additional context:

The issue occurs consistently.
Generated Issue
## Description

The export button on the reports page does nothing when clicked.

## Steps to Reproduce

Open the reports page, select a report, and click Export.

## Expected Behavior

The selected report should be downloaded as a CSV file.

## Actual Behavior

Nothing happens after clicking the Export button.

## Environment

Chrome 126, Windows 11, App v2.4.1.

## Additional Context

The issue occurs consistently.

The user then sees:

Create this issue on GitHub? [y/N]:

Only an explicit approval creates the issue.

🧠 Design Decisions
Why MCP?

MCP provides a standardized interface between the AI agent and external capabilities.

Instead of embedding GitHub API logic directly into the Gemini workflow, GitHub operations are exposed as MCP tools.

                 Gemini
                    │
                    │ MCP
                    ▼
              GitHub Tools
                    │
                    ▼
              GitHub REST API

This keeps the AI layer separated from external-service logic and makes the tools reusable.

Why separate duplicate retrieval and semantic analysis?

The candidate retrieval process is inexpensive and deterministic enough to narrow the search space.

Gemini then performs the more expensive semantic reasoning only on relevant candidates.

All Open Issues
      │
      ▼
Lexical Candidate Ranking
      │
      ▼
Small Candidate Set
      │
      ▼
Gemini Semantic Analysis
      │
      ▼
Duplicate / Not Duplicate

This is more efficient than asking an LLM to reason over every issue in a repository.

Why require human approval?

Creating a GitHub issue is a persistent external side effect.

The system therefore separates:

AI Reasoning

from:

External Write Operation

The AI proposes the issue while the user controls the final action.

Why restrict tools by phase?

Different workflow stages require different capabilities.

Giving the model access to every tool at every stage increases the possibility of unintended behavior.

Instead:

Duplicate Phase
       │
       ▼
check_duplicate_issue

Generate Phase
       │
       ├── list_github_labels
       └── generate_issue

Creation Phase
       │
       ▼
create_github_issue
(client controlled)

This makes the agent's permissions explicit and easier to reason about.

🚧 Future Improvements

Potential future improvements include:

More sophisticated duplicate-ranking algorithms
GitHub issue comments
Issue updates
Issue assignment
Milestone support
GitHub Projects integration
Pull-request creation
Automatic issue categorization
Repository-specific issue templates
Support for multiple GitHub repositories
Persistent conversation context
Streaming Gemini responses
More comprehensive end-to-end integration tests
Structured logging and observability
Metrics for agent/tool execution
Repository-specific issue policies
🎯 Project Goals

This project demonstrates how to combine:

LLM Reasoning
      +
MCP Tool Calling
      +
External APIs
      +
Structured Validation
      +
Semantic Duplicate Detection
      +
Human Approval
      +
Automated Testing

The main goal is not simply to generate GitHub issues with AI.

The goal is to demonstrate a controlled agentic workflow where:

The model can reason
The model can use tools
Tool access is restricted by workflow phase
GitHub operations are isolated behind MCP
Duplicate detection combines deterministic retrieval with AI reasoning
Persistent writes require explicit human approval
Temporary AI failures are handled automatically
The entire workflow is covered by automated tests
📌 Current Status
Project Status: Functional

TypeScript:
✓ Typecheck passing

Tests:
✓ 9 test files
✓ 43 tests
✓ 43 passing

Core Workflow:
✓ MCP server
✓ MCP client
✓ Gemini integration
✓ Duplicate candidate retrieval
✓ Semantic duplicate analysis
✓ Issue generation
✓ Label retrieval
✓ Human approval
✓ GitHub issue creation

Safety:
✓ Phase-restricted Gemini tools
✓ Autonomous write protection
✓ Client-controlled GitHub creation

Reliability:
✓ Gemini 429 retry handling
✓ Gemini 5xx retry handling
✓ Daily quota detection
✓ Configurable retry policy
✓ Invalid JSON handling
📄 License

This project is intended as a demonstration of an AI-powered, MCP-based GitHub issue management workflow.