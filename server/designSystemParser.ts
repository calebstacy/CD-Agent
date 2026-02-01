import { invokeLLM } from "./_core/llm";

/**
 * Parse and analyze design system files to extract:
 * - Design tokens (colors, typography, spacing)
 * - Component library information
 * - Brand voice patterns from existing copy
 */

export interface ParsedDesignSystem {
  colors?: Record<string, string>;
  typography?: {
    fontFamily?: string;
    headingSizes?: Record<string, string>;
    bodySizes?: Record<string, string>;
  };
  spacing?: Record<string, string>;
  components?: Array<{
    name: string;
    type: string;
    variants: Array<{
      name: string;
      characterLimit?: number;
      description?: string;
    }>;
  }>;
}

export interface BrandVoiceAnalysis {
  tone: string[];
  vocabulary: {
    preferred: string[];
    avoid: string[];
    terminology: Record<string, string>;
  };
  patterns: {
    sentenceStructure: string;
    punctuation: string;
    capitalization: string;
  };
  aiAnalysis: string;
  confidence: number;
}

/**
 * Parse Figma file data to extract design system information
 */
export async function parseFigmaFile(figmaData: any): Promise<ParsedDesignSystem> {
  try {
    // Extract colors from styles
    const colors: Record<string, string> = {};
    if (figmaData.styles) {
      for (const [key, style] of Object.entries(figmaData.styles)) {
        if ((style as any).styleType === "FILL") {
          const fills = (style as any).fills;
          if (fills && fills[0]) {
            const color = fills[0].color;
            colors[key] = rgbToHex(color.r, color.g, color.b);
          }
        }
      }
    }

    // Extract typography
    const typography: ParsedDesignSystem["typography"] = {
      fontFamily: figmaData.defaultFontFamily,
      headingSizes: {},
      bodySizes: {},
    };

    // Extract components
    const components: ParsedDesignSystem["components"] = [];
    if (figmaData.components) {
      for (const [key, component] of Object.entries(figmaData.components)) {
        const comp = component as any;
        components.push({
          name: comp.name,
          type: inferComponentType(comp.name),
          variants: extractVariants(comp),
        });
      }
    }

    return {
      colors,
      typography,
      components,
    };
  } catch (error) {
    console.error("[Design System Parser] Error parsing Figma file:", error);
    throw new Error("Failed to parse Figma file");
  }
}

/**
 * Parse uploaded design system document (PDF, etc.)
 */
export async function parseDesignSystemDocument(documentText: string): Promise<ParsedDesignSystem> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a design system analyzer. Extract design tokens and component information from design system documentation.
          
Return a JSON object with this structure:
{
  "colors": { "primary": "#hex", "secondary": "#hex", ... },
  "typography": {
    "fontFamily": "Font Name",
    "headingSizes": { "h1": "32px", "h2": "24px", ... },
    "bodySizes": { "large": "18px", "medium": "16px", ... }
  },
  "spacing": { "sm": "8px", "md": "16px", "lg": "24px", ... },
  "components": [
    {
      "name": "Button",
      "type": "button",
      "variants": [
        { "name": "primary", "characterLimit": 20, "description": "Main CTA button" },
        { "name": "secondary", "characterLimit": 20, "description": "Secondary actions" }
      ]
    }
  ]
}`,
        },
        {
          role: "user",
          content: `Extract design system information from this documentation:\n\n${documentText}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "design_system",
          strict: true,
          schema: {
            type: "object",
            properties: {
              colors: {
                type: "object",
                additionalProperties: { type: "string" },
              },
              typography: {
                type: "object",
                properties: {
                  fontFamily: { type: "string" },
                  headingSizes: {
                    type: "object",
                    additionalProperties: { type: "string" },
                  },
                  bodySizes: {
                    type: "object",
                    additionalProperties: { type: "string" },
                  },
                },
                additionalProperties: false,
              },
              spacing: {
                type: "object",
                additionalProperties: { type: "string" },
              },
              components: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    type: { type: "string" },
                    variants: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          characterLimit: { type: "integer" },
                          description: { type: "string" },
                        },
                        required: ["name"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["name", "type", "variants"],
                  additionalProperties: false,
                },
              },
            },
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in LLM response");
    }

    const contentString = typeof content === "string" ? content : JSON.stringify(content);
    return JSON.parse(contentString);
  } catch (error) {
    console.error("[Design System Parser] Error parsing document:", error);
    throw new Error("Failed to parse design system document");
  }
}

/**
 * Analyze existing content examples to learn brand voice
 */
export async function analyzeBrandVoice(contentExamples: Array<{ type: string; text: string; context?: string }>): Promise<BrandVoiceAnalysis> {
  try {
    const examplesText = contentExamples
      .map((ex) => `Type: ${ex.type}\nText: "${ex.text}"\nContext: ${ex.context || "N/A"}`)
      .join("\n\n");

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a brand voice analyst. Analyze content examples to identify brand voice characteristics.
          
Return a JSON object with this structure:
{
  "tone": ["friendly", "professional", "concise"],
  "vocabulary": {
    "preferred": ["words", "they", "use"],
    "avoid": ["words", "they", "dont"],
    "terminology": { "user": "member", "delete": "remove" }
  },
  "patterns": {
    "sentenceStructure": "Description of typical sentence patterns",
    "punctuation": "How they use punctuation",
    "capitalization": "Title Case, Sentence case, etc."
  },
  "aiAnalysis": "Detailed analysis of the brand voice",
  "confidence": 85
}`,
        },
        {
          role: "user",
          content: `Analyze these content examples and identify the brand voice:\n\n${examplesText}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "brand_voice",
          strict: true,
          schema: {
            type: "object",
            properties: {
              tone: {
                type: "array",
                items: { type: "string" },
              },
              vocabulary: {
                type: "object",
                properties: {
                  preferred: {
                    type: "array",
                    items: { type: "string" },
                  },
                  avoid: {
                    type: "array",
                    items: { type: "string" },
                  },
                  terminology: {
                    type: "object",
                    additionalProperties: { type: "string" },
                  },
                },
                required: ["preferred", "avoid", "terminology"],
                additionalProperties: false,
              },
              patterns: {
                type: "object",
                properties: {
                  sentenceStructure: { type: "string" },
                  punctuation: { type: "string" },
                  capitalization: { type: "string" },
                },
                required: ["sentenceStructure", "punctuation", "capitalization"],
                additionalProperties: false,
              },
              aiAnalysis: { type: "string" },
              confidence: { type: "integer" },
            },
            required: ["tone", "vocabulary", "patterns", "aiAnalysis", "confidence"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in LLM response");
    }

    const contentString = typeof content === "string" ? content : JSON.stringify(content);
    return JSON.parse(contentString);
  } catch (error) {
    console.error("[Brand Voice Analyzer] Error:", error);
    throw new Error("Failed to analyze brand voice");
  }
}

// Helper functions

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function inferComponentType(name: string): string {
  const nameLower = name.toLowerCase();
  if (nameLower.includes("button") || nameLower.includes("btn")) return "button";
  if (nameLower.includes("input") || nameLower.includes("field")) return "input";
  if (nameLower.includes("card")) return "card";
  if (nameLower.includes("modal") || nameLower.includes("dialog")) return "modal";
  if (nameLower.includes("alert") || nameLower.includes("toast")) return "alert";
  return "custom";
}

function extractVariants(component: any): Array<{ name: string; characterLimit?: number; description?: string }> {
  const variants: Array<{ name: string; characterLimit?: number; description?: string }> = [];

  // If component has variantProperties, extract them
  if (component.variantProperties) {
    for (const prop of Object.keys(component.variantProperties)) {
      variants.push({
        name: prop,
        description: `${prop} variant`,
      });
    }
  }

  // Default variant if none found
  if (variants.length === 0) {
    variants.push({
      name: "default",
      description: "Default variant",
    });
  }

  return variants;
}
