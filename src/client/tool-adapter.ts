export function mcpToolsToGeminiTools(
  tools: any[]
) {
  return [
    {
      functionDeclarations: tools.map(
        (tool) => ({
          name: tool.name,
          description:
            tool.description ?? "",
          parameters: tool.inputSchema,
        })
      ),
    },
  ];
}