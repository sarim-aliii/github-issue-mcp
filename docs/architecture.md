## Overview

GitHub Issue MCP is structured around a reusable MCP server layer
and a separate interactive client workflow.

```text
                    MCP Client
                        │
                        ▼
              ┌──────────────────┐
              │ GitHub Issue MCP  │
              │      Server       │
              └────────┬─────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
 generate_issue   duplicate_check   GitHub tools
        │              │              │
        ▼              ▼              ▼
   Issue schema       AI          GitHub API