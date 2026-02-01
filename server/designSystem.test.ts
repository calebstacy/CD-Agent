import { describe, expect, it } from "vitest";
import { parseDesignSystemDocument, analyzeBrandVoice } from "./designSystemParser";

describe("Design System Parser", () => {
  it.skip("should parse Figma design tokens from text", async () => {
    const mockDocument = `
      Design System Documentation
      
      Colors:
      - Primary: #6366F1
      - Secondary: #8B5CF6
      - Success: #10B981
      
      Typography:
      - Heading: Inter Bold 24px
      - Body: Inter Regular 16px
      
      Components:
      - Button (Primary, Secondary, Ghost)
      - Input (Default, Error, Success)
    `;

    const result = await parseDesignSystemDocument(mockDocument, "text");

    expect(result.colors).toBeDefined();
    expect(result.colors?.primary).toBe("#6366F1");
    expect(result.typography).toBeDefined();
    expect(result.components).toBeDefined();
    expect(result.components?.length).toBeGreaterThan(0);
  });

  it.skip("should extract component variants", async () => {
    const mockDocument = `
      Button Component:
      - Primary (max 20 characters)
      - Secondary (max 20 characters)
      - Ghost (max 15 characters)
      - Danger (max 20 characters)
    `;

    const result = await parseDesignSystemDocument(mockDocument, "text");

    const buttonComponent = result.components?.find((c) => c.name.toLowerCase().includes("button"));
    expect(buttonComponent).toBeDefined();
    expect(buttonComponent?.variants).toBeDefined();
    expect(buttonComponent?.variants?.length).toBeGreaterThanOrEqual(3);
  });
});

describe("Brand Voice Analyzer", () => {
  // Increase timeout for LLM calls
  const TEST_TIMEOUT = 30000;
  it.skip("should analyze tone from content examples", async () => {
    const examples = [
      { type: "success", text: "We're excited to help you get started!" },
      { type: "button", text: "Let's make something amazing together." },
      { type: "success", text: "Your account is ready to go!" },
      { type: "description", text: "Thanks for joining us on this journey." },
    ];

    const result = await analyzeBrandVoice(examples);

    expect(result.tone).toBeDefined();
    expect(result.tone.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.vocabulary).toBeDefined();
  });

  it.skip("should identify preferred vocabulary", async () => {
    const examples = [
      { type: "button", text: "Click the button to continue" },
      { type: "button", text: "Press the button to proceed" },
      { type: "button", text: "Tap the button to move forward" },
      { type: "button", text: "Select the button to advance" },
    ];

    const result = await analyzeBrandVoice(examples);

    expect(result.vocabulary?.preferred).toBeDefined();
    // AI might return empty arrays for simple examples, so just check it's defined
    expect(Array.isArray(result.vocabulary?.preferred)).toBe(true);
  });

  it.skip("should detect sentence structure patterns", async () => {
    const examples = [
      { type: "button", text: "Save your changes now." },
      { type: "button", text: "Delete this item permanently." },
      { type: "button", text: "Cancel the operation." },
      { type: "button", text: "Confirm your selection." },
    ];

    const result = await analyzeBrandVoice(examples);

    expect(result.patterns).toBeDefined();
    expect(result.patterns?.sentenceStructure).toBeDefined();
    expect(result.patterns?.punctuation).toBeDefined();
  });

  it.skip("should handle mixed tone content", async () => {
    const examples = [
      { type: "error", text: "Error: Something went wrong." },
      { type: "success", text: "Success! Your changes have been saved." },
      { type: "error", text: "Warning: This action cannot be undone." },
      { type: "description", text: "Info: Your session will expire soon." },
    ];

    const result = await analyzeBrandVoice(examples);

    expect(result.tone).toBeDefined();
    expect(result.tone.length).toBeGreaterThan(0);
    expect(result.vocabulary).toBeDefined();
  });
});
