import { describe, it, expect } from "vitest";
import { invokeLLM } from "./_core/llm";

describe("Anthropic API Integration", () => {
  it("should successfully call Claude with Anthropic API key", async () => {
    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: "Say 'hello' in one word",
        },
      ],
      max_tokens: 10,
    });

    expect(response).toBeDefined();
    expect(response.choices).toBeDefined();
    expect(response.choices.length).toBeGreaterThan(0);
    expect(response.choices[0].message).toBeDefined();
    expect(response.choices[0].message.content).toBeDefined();
    expect(typeof response.choices[0].message.content).toBe("string");
    
    // Verify we're using Claude Sonnet 4.5, not Gemini
    expect(response.model).toContain("claude-sonnet-4-5");
  }, 30000); // 30 second timeout for API call
});
