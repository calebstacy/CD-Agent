import { invokeLLM } from "./_core/llm";

export type ContentType =
  | "button"
  | "error"
  | "success"
  | "empty_state"
  | "form_label"
  | "tooltip"
  | "navigation"
  | "heading"
  | "description"
  | "placeholder";

export interface GenerateContentRequest {
  contentType: ContentType;
  purpose: string;
  context?: string;
  brandVoice?: string;
  nSuggestions?: number;
}

export interface ContentSuggestion {
  copy: string;
  rationale: string;
}

export interface GenerateContentResponse {
  suggestions: ContentSuggestion[];
  model: string;
}

const CONTENT_TYPE_GUIDELINES: Record<ContentType, string> = {
  button:
    "Button labels should be action-oriented, concise (1-3 words), and clearly indicate what will happen when clicked. Use verbs that describe the action (Save, Delete, Continue). Avoid generic labels like 'OK' or 'Submit' when more specific alternatives exist.",
  error:
    "Error messages should be clear, specific, and helpful. Explain what went wrong and how to fix it. Avoid technical jargon and blame. Use a supportive tone that helps users recover from the error.",
  success:
    "Success messages should be positive, specific, and confirm what action was completed. Keep them brief but celebratory when appropriate. Help users understand what happens next.",
  empty_state:
    "Empty state messages should be encouraging and guide users toward their first action. Explain why the space is empty and what they can do to fill it. Use a friendly, supportive tone.",
  form_label:
    "Form labels should be clear, concise, and descriptive. Use sentence case. Avoid redundant words like 'Enter' or 'Type'. Make it obvious what information is expected.",
  tooltip:
    "Tooltips should provide brief, helpful context without repeating visible text. Keep them under 100 characters. Use them to clarify, not to provide essential information.",
  navigation:
    "Navigation labels should be clear, scannable, and predictable. Use familiar terms that match user mental models. Keep them short (1-2 words) and consistent across the interface.",
  heading:
    "Headings should be clear, descriptive, and hierarchical. Use them to organize content and help users scan. Front-load important words. Use sentence case unless it's a proper noun.",
  description:
    "Descriptions should provide clear context and value. Use plain language and active voice. Break up long descriptions into shorter sentences. Focus on benefits, not just features.",
  placeholder:
    "Placeholder text should provide helpful examples or formatting guidance. Don't use it for essential instructions. Keep it brief and use a lighter tone than labels.",
};

const SYSTEM_PROMPT = `You are an expert content designer and UX writer with deep knowledge of best practices from:
- Material Design (Google)
- Human Interface Guidelines (Apple)
- Microsoft Writing Style Guide
- Nielsen Norman Group research
- GOV.UK content design principles

Your role is to generate high-quality, user-centered microcopy and UX content that is:
- Clear and concise
- Action-oriented and specific
- Accessible and inclusive
- Consistent with brand voice
- Optimized for scannability
- Empathetic and human

Always provide rationale based on UX writing principles and best practices.`;

export async function generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
  const { contentType, purpose, context, brandVoice, nSuggestions = 3 } = request;

  const guidelines = CONTENT_TYPE_GUIDELINES[contentType];

  const userPrompt = `Generate ${nSuggestions} ${contentType.replace("_", " ")} suggestions for the following:

**Purpose**: ${purpose}
${context ? `**Context**: ${context}` : ""}
${brandVoice ? `**Brand Voice**: ${brandVoice}` : "**Brand Voice**: Friendly and professional"}

**Guidelines for ${contentType.replace("_", " ")}**:
${guidelines}

Return ONLY a JSON array with this exact structure:
[
  {
    "copy": "The actual text suggestion",
    "rationale": "Brief explanation of why this works (1-2 sentences)"
  }
]

Make sure each suggestion is meaningfully different and follows UX writing best practices.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "content_suggestions",
          strict: true,
          schema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    copy: {
                      type: "string",
                      description: "The actual text suggestion",
                    },
                    rationale: {
                      type: "string",
                      description: "Brief explanation of why this works",
                    },
                  },
                  required: ["copy", "rationale"],
                  additionalProperties: false,
                },
              },
            },
            required: ["suggestions"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in LLM response");
    }

    // Handle both string and array content types
    let contentString = '';
    if (typeof content === 'string') {
      contentString = content;
    } else if (Array.isArray(content)) {
      contentString = content
        .filter((item): item is { type: 'text'; text: string } => 'type' in item && item.type === 'text')
        .map(item => item.text)
        .join('');
    }

    const parsed = JSON.parse(contentString);
    const suggestions = parsed.suggestions as ContentSuggestion[];

    return {
      suggestions,
      model: response.model || "unknown",
    };
  } catch (error) {
    console.error("[Content Generation] Error:", error);
    throw new Error("Failed to generate content suggestions");
  }
}

// Frame analysis for Figma plugin
export interface FrameAnalysisRequest {
  action: "spec" | "describe" | "propose_alts" | "audit" | "fill_copy" | "ab_variants";
  frameData: {
    name: string;
    layers: Array<{
      type: string;
      name: string;
      text?: string;
      position?: { x: number; y: number };
    }>;
  };
  context?: string;
  brandVoice?: string;
}

export async function analyzeFrame(request: FrameAnalysisRequest) {
  const { action, frameData, context, brandVoice } = request;

  let actionPrompt = "";
  switch (action) {
    case "spec":
      actionPrompt = "Generate detailed design specifications for this frame, including layout, spacing, typography, and interaction patterns.";
      break;
    case "describe":
      actionPrompt = "Describe the user flow and purpose of this screen. Explain what the user is trying to accomplish and how the design supports that goal.";
      break;
    case "propose_alts":
      actionPrompt = "Propose alternative approaches for the copy and layout of this screen. Suggest 3 different variations with rationale for each.";
      break;
    case "audit":
      actionPrompt =
        "Audit this screen for UX best practices, accessibility, and content design quality. Identify issues and suggest improvements.";
      break;
    case "fill_copy":
      actionPrompt = "Generate appropriate copy for all text elements in this frame, maintaining consistency and following UX writing best practices.";
      break;
    case "ab_variants":
      actionPrompt = "Create 2 A/B test variants of this screen with different copy approaches. Explain what each variant tests.";
      break;
  }

  const userPrompt = `${actionPrompt}

**Frame Name**: ${frameData.name}
**Layers**: ${JSON.stringify(frameData.layers, null, 2)}
${context ? `**Context**: ${context}` : ""}
${brandVoice ? `**Brand Voice**: ${brandVoice}` : ""}

Provide detailed, actionable recommendations based on UX best practices.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const messageContent = response.choices[0]?.message?.content;
    let analysis = '';
    if (typeof messageContent === 'string') {
      analysis = messageContent;
    } else if (Array.isArray(messageContent)) {
      // Extract text from array of content items
      analysis = messageContent
        .filter((item): item is { type: 'text'; text: string } => 'type' in item && item.type === 'text')
        .map(item => item.text)
        .join('\n');
    }

    return {
      analysis,
      model: response.model || "unknown",
    };
  } catch (error) {
    console.error("[Frame Analysis] Error:", error);
    throw new Error("Failed to analyze frame");
  }
}
