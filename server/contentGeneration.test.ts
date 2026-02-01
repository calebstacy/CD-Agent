import { describe, expect, it, vi } from "vitest";
import { generateContent, analyzeFrame } from "./contentGeneration";

// Mock the LLM invocation
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            suggestions: [
              { copy: "Test Button", rationale: "Clear and action-oriented" },
              { copy: "Click Here", rationale: "Simple and direct" },
              { copy: "Get Started", rationale: "Encouraging and clear" },
            ],
          }),
        },
      },
    ],
    model: "gpt-4.1-mini",
  }),
}));

describe("Content Generation", () => {
  describe("generateContent", () => {
    it("generates content suggestions for button type", async () => {
      const result = await generateContent({
        contentType: "button",
        purpose: "submit form",
        nSuggestions: 3,
      });

      expect(result).toHaveProperty("suggestions");
      expect(result.suggestions).toHaveLength(3);
      expect(result.suggestions[0]).toHaveProperty("copy");
      expect(result.suggestions[0]).toHaveProperty("rationale");
      expect(result).toHaveProperty("model");
    });

    it("includes brand voice in generation when provided", async () => {
      const result = await generateContent({
        contentType: "error",
        purpose: "invalid email",
        brandVoice: "friendly, helpful",
        nSuggestions: 3,
      });

      expect(result).toHaveProperty("suggestions");
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it("includes context when provided", async () => {
      const result = await generateContent({
        contentType: "empty_state",
        purpose: "no messages",
        context: "inbox page for email client",
        nSuggestions: 3,
      });

      expect(result).toHaveProperty("suggestions");
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe("analyzeFrame", () => {
    it("analyzes frame for spec generation", async () => {
      const result = await analyzeFrame({
        action: "spec",
        frameData: {
          name: "Login Screen",
          layers: [
            { type: "TEXT", name: "Title", text: "Welcome Back" },
            { type: "INPUT", name: "Email Field" },
            { type: "BUTTON", name: "Login Button", text: "Log In" },
          ],
        },
      });

      expect(result).toHaveProperty("analysis");
      expect(typeof result.analysis).toBe("string");
      expect(result.analysis.length).toBeGreaterThan(0);
    });

    it("analyzes frame for flow description", async () => {
      const result = await analyzeFrame({
        action: "describe",
        frameData: {
          name: "Checkout Flow",
          layers: [
            { type: "TEXT", name: "Step 1" },
            { type: "TEXT", name: "Step 2" },
            { type: "TEXT", name: "Step 3" },
          ],
        },
      });

      expect(result).toHaveProperty("analysis");
      expect(typeof result.analysis).toBe("string");
    });
  });
});
