import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { invokeLLM, type Message, type Role } from "./_core/llm";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { analyzeFrame, generateContent } from "./contentGeneration";
import * as db from "./db";

// Subscription tier limits
const TIER_LIMITS = {
  free: 25,
  pro: 1000,
  team: 5000,
  business: 25000,
  enterprise: Infinity,
};

// Helper to check usage limits
async function checkUsageLimit(userId: number) {
  const user = await db.getUserById(userId);
  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
  }

  // Admin users have unlimited generations
  if (user.role === "admin") {
    return { allowed: true, remaining: Infinity };
  }

  const limit = TIER_LIMITS[user.subscriptionTier];
  
  // Check if we need to reset monthly count
  const now = new Date();
  const lastReset = user.lastResetDate;
  if (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear()) {
    await db.resetMonthlyGenerations(userId);
    return { allowed: true, remaining: limit - 1 };
  }

  if (user.generationsThisMonth >= limit) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: limit - user.generationsThisMonth };
}

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Content generation
  generate: router({
    create: protectedProcedure
      .input(
        z.object({
          contentType: z.enum([
            "button",
            "error",
            "success",
            "empty_state",
            "form_label",
            "tooltip",
            "navigation",
            "heading",
            "description",
            "placeholder",
          ]),
          purpose: z.string().min(1),
          context: z.string().optional(),
          brandVoice: z.string().optional(),
          projectId: z.number().optional(),
          nSuggestions: z.number().min(1).max(5).default(3),
          designSystemId: z.number().optional(),
          componentVariant: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check usage limits
        const usageCheck = await checkUsageLimit(ctx.user.id);
        if (!usageCheck.allowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Monthly generation limit reached. Please upgrade your plan.",
          });
        }

        // Generate content
        const result = await generateContent({
          contentType: input.contentType,
          purpose: input.purpose,
          context: input.context,
          brandVoice: input.brandVoice,
          nSuggestions: input.nSuggestions,
          designSystemId: input.designSystemId,
          componentVariant: input.componentVariant,
        }, ctx.user.id);

        // Save to database
        const generation = await db.createGeneration({
          userId: ctx.user.id,
          projectId: input.projectId,
          contentType: input.contentType,
          purpose: input.purpose,
          context: input.context,
          brandVoice: input.brandVoice,
          suggestions: result.suggestions,
          model: result.model,
        });

        // Increment usage counter
        await db.incrementUserGenerations(ctx.user.id);

        return {
          generation,
          remaining: usageCheck.remaining - 1,
        };
      }),

    history: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }))
      .query(async ({ ctx, input }) => {
        return db.getUserGenerations(ctx.user.id, input.limit);
      }),

    library: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserLibrary(ctx.user.id);
    }),

    toggleFavorite: protectedProcedure
      .input(z.object({ generationId: z.number(), isFavorite: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.toggleFavorite(input.generationId, input.isFavorite);
        return { success: true };
      }),

    toggleLibrary: protectedProcedure
      .input(z.object({ generationId: z.number(), isInLibrary: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        await db.toggleLibrary(input.generationId, input.isInLibrary);
        return { success: true };
      }),
  }),

  // Projects
  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserProjects(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
          brandVoice: z.string().optional(),
          teamId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.createProject({
          ...input,
          userId: ctx.user.id,
        });
      }),

    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getProjectById(input.id);
    }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
          brandVoice: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateProject(id, data);
        return { success: true };
      }),

    archive: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.archiveProject(input.id);
      return { success: true };
    }),

    generations: protectedProcedure.input(z.object({ projectId: z.number() })).query(async ({ input }) => {
      return db.getProjectGenerations(input.projectId);
    }),
  }),

  // Teams
  teams: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserTeams(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          brandVoicePreset: z.string().optional(),
          brandVoiceCustom: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.createTeam({
          ...input,
          ownerId: ctx.user.id,
        });
      }),

    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return db.getTeamById(input.id);
    }),

    updateBrandVoice: protectedProcedure
      .input(
        z.object({
          teamId: z.number(),
          brandVoicePreset: z.string().optional(),
          brandVoiceCustom: z.string().optional(),
          brandGuidelines: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { teamId, ...data } = input;
        await db.updateTeamBrandVoice(teamId, data);
        return { success: true };
      }),

    members: protectedProcedure.input(z.object({ teamId: z.number() })).query(async ({ input }) => {
      return db.getTeamMembers(input.teamId);
    }),

    projects: protectedProcedure.input(z.object({ teamId: z.number() })).query(async ({ input }) => {
      return db.getTeamProjects(input.teamId);
    }),
  }),

  // Figma plugin endpoints
  figma: router({
    analyzeFrame: protectedProcedure
      .input(
        z.object({
          action: z.enum(["spec", "describe", "propose_alts", "audit", "fill_copy", "ab_variants"]),
          frameData: z.object({
            name: z.string(),
            layers: z.array(
              z.object({
                type: z.string(),
                name: z.string(),
                text: z.string().optional(),
                position: z.object({ x: z.number(), y: z.number() }).optional(),
              })
            ),
          }),
          context: z.string().optional(),
          brandVoice: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check usage limits
        const usageCheck = await checkUsageLimit(ctx.user.id);
        if (!usageCheck.allowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Monthly generation limit reached. Please upgrade your plan.",
          });
        }

        const result = await analyzeFrame(input);
        
        // Increment usage counter
        await db.incrementUserGenerations(ctx.user.id);

        return {
          ...result,
          remaining: usageCheck.remaining - 1,
        };
      }),
  }),

  // User profile and settings
  user: router({
    profile: protectedProcedure.query(async ({ ctx }) => {
      return ctx.user;
    }),

    usage: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const limit = TIER_LIMITS[user.subscriptionTier];
      return {
        current: user.generationsThisMonth,
        limit,
        total: user.generationsTotal,
        tier: user.subscriptionTier,
      };
    }),

    analytics: protectedProcedure.input(z.object({ days: z.number().default(30) })).query(async ({ ctx, input }) => {
      return db.getUserAnalytics(ctx.user.id, input.days);
    }),
  }),

  // Design Systems
  designSystems: router({
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          projectId: z.number().optional(),
          sourceType: z.enum(["figma", "upload", "manual"]).optional(),
          sourceUrl: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return db.createDesignSystem({
          ...input,
          userId: ctx.user.id,
        });
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getDesignSystemsByUser(ctx.user.id);
    }),

    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const designSystem = await db.getDesignSystemById(input.id);
      if (!designSystem || designSystem.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return designSystem;
    }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          description: z.string().optional(),
          colors: z.record(z.string(), z.string()).optional(),
          typography: z.any().optional(),
          spacing: z.record(z.string(), z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const designSystem = await db.getDesignSystemById(id);
        if (!designSystem || designSystem.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await db.updateDesignSystem(id, data as any);
        return { success: true };
      }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      const designSystem = await db.getDesignSystemById(input.id);
      if (!designSystem || designSystem.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await db.deleteDesignSystem(input.id);
      return { success: true };
    }),

    // Parse design system document
    parseDocument: protectedProcedure
      .input(
        z.object({
          designSystemId: z.number(),
          documentText: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const designSystem = await db.getDesignSystemById(input.designSystemId);
        if (!designSystem || designSystem.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const { parseDesignSystemDocument } = await import("./designSystemParser");
        const parsed = await parseDesignSystemDocument(input.documentText);

        // Update design system with parsed data
        await db.updateDesignSystem(input.designSystemId, {
          colors: parsed.colors,
          typography: parsed.typography,
          spacing: parsed.spacing,
        });

        // Create component libraries
        if (parsed.components) {
          for (const comp of parsed.components) {
            await db.createComponentLibrary({
              designSystemId: input.designSystemId,
              name: comp.name,
              type: comp.type as any,
              variants: comp.variants,
            });
          }
        }

        return { success: true, parsed };
      }),

    // Analyze brand voice from examples
    analyzeBrandVoice: protectedProcedure
      .input(
        z.object({
          designSystemId: z.number(),
          examples: z.array(
            z.object({
              type: z.string(),
              text: z.string(),
              context: z.string().optional(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const designSystem = await db.getDesignSystemById(input.designSystemId);
        if (!designSystem || designSystem.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const { analyzeBrandVoice } = await import("./designSystemParser");
        const analysis = await analyzeBrandVoice(input.examples);

        // Create brand voice profile
        const profile = await db.createBrandVoiceProfile({
          designSystemId: input.designSystemId,
          name: "Analyzed Brand Voice",
          tone: analysis.tone,
          vocabulary: analysis.vocabulary,
          patterns: analysis.patterns,
          aiAnalysis: analysis.aiAnalysis,
          confidence: analysis.confidence,
        });

        // Store examples
        const exampleRecords = input.examples.map((ex) => ({
          designSystemId: input.designSystemId,
          type: ex.type as any,
          text: ex.text,
          context: ex.context,
        }));
        await db.bulkCreateContentExamples(exampleRecords);

        return { success: true, profile, analysis };
      }),

    // Get components for a design system
    components: protectedProcedure.input(z.object({ designSystemId: z.number() })).query(async ({ ctx, input }) => {
      const designSystem = await db.getDesignSystemById(input.designSystemId);
      if (!designSystem || designSystem.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return db.getComponentLibrariesByDesignSystem(input.designSystemId);
    }),

    // Get brand voice profiles
    brandVoices: protectedProcedure.input(z.object({ designSystemId: z.number() })).query(async ({ ctx, input }) => {
      const designSystem = await db.getDesignSystemById(input.designSystemId);
      if (!designSystem || designSystem.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return db.getBrandVoiceProfilesByDesignSystem(input.designSystemId);
    }),

    // Get content examples
    examples: protectedProcedure
      .input(
        z.object({
          designSystemId: z.number(),
          type: z.string().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const designSystem = await db.getDesignSystemById(input.designSystemId);
        if (!designSystem || designSystem.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return db.getContentExamplesByDesignSystem(input.designSystemId, input.type);
      }),
  }),

  // Chat interface
  chat: router({
    // Create new conversation
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().optional(),
          designSystemId: z.number().optional(),
          projectId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const conversationDb = await import("./conversationDb");
        const conversationId = await conversationDb.createConversation({
          userId: ctx.user.id,
          title: input.title,
          designSystemId: input.designSystemId,
          projectId: input.projectId,
        });
        return { conversationId };
      }),

    // Get conversation list
    list: protectedProcedure.query(async ({ ctx }) => {
      const conversationDb = await import("./conversationDb");
      return conversationDb.getConversationsByUserId(ctx.user.id);
    }),

    // Get conversation with messages
    get: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .query(async ({ ctx, input }) => {
        const conversationDb = await import("./conversationDb");
        const conversation = await conversationDb.getConversationWithMessages(input.conversationId);
        if (!conversation || conversation.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return conversation;
      }),

    // Update conversation title
    updateTitle: protectedProcedure
      .input(
        z.object({
          conversationId: z.number(),
          title: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const conversationDb = await import("./conversationDb");
        const conversation = await conversationDb.getConversationById(input.conversationId);
        if (!conversation || conversation.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await conversationDb.updateConversationTitle(input.conversationId, input.title);
      }),

    // Archive conversation
    archive: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const conversationDb = await import("./conversationDb");
        const conversation = await conversationDb.getConversationById(input.conversationId);
        if (!conversation || conversation.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await conversationDb.archiveConversation(input.conversationId);
      }),

    // Send message
    send: protectedProcedure
      .input(
        z.object({
          conversationId: z.number().optional(),
          message: z.string().min(1),
          images: z.array(z.object({ url: z.string(), alt: z.string().optional() })).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check usage limits
        const usageCheck = await checkUsageLimit(ctx.user.id);
        if (!usageCheck.allowed) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Monthly generation limit reached. Please upgrade your plan.",
          });
        }

        // Load relevant patterns from user's pattern library
        const patternDb = await import("./patternDb");
        
        // Detect component type from message for pattern matching
        const componentTypeMap: Record<string, string> = {
          button: "button", btn: "button", cta: "cta", "call to action": "cta",
          error: "error", "error message": "error", warning: "error",
          success: "success", confirmation: "success",
          empty: "empty_state", "empty state": "empty_state", "no results": "empty_state",
          form: "form_label", label: "form_label", field: "form_label",
          tooltip: "tooltip", hint: "tooltip", help: "tooltip",
          nav: "navigation", menu: "navigation", link: "navigation",
          heading: "heading", title: "heading", header: "heading",
          description: "description", desc: "description", body: "description",
          placeholder: "placeholder", input: "placeholder",
          modal: "modal_title", dialog: "modal_title", popup: "modal_title",
          notification: "notification", toast: "notification", alert: "notification",
          onboarding: "onboarding", welcome: "onboarding", intro: "onboarding",
        };
        
        const messageLower = input.message.toLowerCase();
        let detectedType: string | undefined;
        for (const [keyword, type] of Object.entries(componentTypeMap)) {
          if (messageLower.includes(keyword)) {
            detectedType = type;
            break;
          }
        }
        
        // Get relevant patterns if we detected a component type
        let patternContext = "";
        if (detectedType) {
          patternContext = await patternDb.getPatternsAsContext({
            userId: ctx.user.id,
            componentType: detectedType,
            limit: 5,
          });
        }

        // Build system prompt with conversational personality
        const systemPrompt = `You're a senior content designer. You've worked on everything from consumer apps to enterprise products. You know UX writing, microcopy, content strategy—the whole deal.

You're here to help someone think through content design problems. Not lecture them. Not write essays. Just have a real conversation.

## How you work:

- **Get to the point.** Share your thinking, but don't over-explain. If something needs 3 sentences, use 3—not 10.
- **Be specific.** When someone shows you a screenshot, talk about what you actually see. Not generic principles.
- **Think out loud, briefly.** "Hmm, this feels unclear because..." or "I'd try X here." Natural, not verbose.
- **Show, don't tell.** Use artifacts to present copy options visually instead of bullet lists.
- **Ask when unclear.** "What's the context here?" beats guessing.

## Artifacts - Show Your Work Visually

**ALWAYS show 3-4 copy variations using copy-options artifact.** This is your default.

:::artifact{type="copy-options" title="Error message"}
- Couldn't join [Friend's Name]. Something went wrong on our end. Try again in a bit.
- We couldn't connect you to [Friend's Name]. Try again in a moment?
- Can't join right now—something's off on our side. Give it another shot in a minute.
- Unable to join [Friend's Name]. Technical issue on our end. Please retry shortly.
:::

For before/after comparisons (when user asks to improve existing copy):

:::artifact{type="before-after"}
before: An error occurred
after: Couldn't save your changes. Try again?
:::

For empty states:

:::artifact{type="empty-state"}
icon: 📋
heading: No tasks yet
body: Create your first task to get started
cta: New task
:::

**IMPORTANT:**
- Default to copy-options with 3-4 variations. Always give options, not one answer.
- Only use ui-preview if user explicitly asks to see what it looks like as a button
- Never suggest just one option. Always show alternatives.

## When analyzing screenshots:

1. Look at what's actually there
2. Point out 2-3 specific things (good or needs work)
3. Use artifacts to show improved versions
4. Ask if you need more context

Don't:
- Write sections with headers like "Initial Thoughts" or "Overall Recommendation"
- List every pro and con in bullet points
- Explain why you're explaining things
- Use phrases like "Let me break this down" or "Here's what I'm thinking"

Just talk like a colleague would. Direct, helpful, concise. And show your suggestions visually with artifacts.${patternContext ? `

## Product Copy Patterns

The user has saved these patterns from their product. Use them as reference for tone, style, and consistency:${patternContext}` : ""}`;

        const conversationDb = await import("./conversationDb");
        
        // Create conversation if needed
        let conversationId = input.conversationId;
        if (!conversationId) {
          conversationId = await conversationDb.createConversation({
            userId: ctx.user.id,
            title: input.message.substring(0, 50), // Use first 50 chars as title
          });
        }
        
        // Load conversation history
        const conversation = await conversationDb.getConversationWithMessages(conversationId);
        if (!conversation || conversation.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        
        // Build conversation messages from history
        const messages: Message[] = [
          { role: 'system', content: systemPrompt },
          ...conversation.messages.map(msg => {
            // Reconstruct message with images if present
            if (msg.images && Array.isArray(msg.images) && msg.images.length > 0) {
              const content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
                { type: 'text', text: msg.content }
              ];
              msg.images.forEach((img: any) => {
                content.push({
                  type: 'image_url',
                  image_url: { url: img.url }
                });
              });
              return {
                role: msg.role as Role,
                content
              };
            }
            return {
              role: msg.role as Role,
              content: msg.content
            };
          }),
        ];
        
        // Add current user message with images if present
        if (input.images && input.images.length > 0) {
          const userContent: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
            { type: 'text', text: input.message }
          ];
          input.images.forEach(img => {
            userContent.push({
              type: 'image_url',
              image_url: { url: img.url }
            });
          });
          messages.push({ role: 'user', content: userContent });
        } else {
          messages.push({ role: 'user', content: input.message });
        }
        
        // Save user message
        await conversationDb.createMessage({
          conversationId,
          role: 'user',
          content: input.message,
          images: input.images,
        });

        // Call LLM
        const llmResponse = await invokeLLM({ messages });
        console.log('[DEBUG] Model returned:', llmResponse.model);
        const messageContent = llmResponse.choices[0].message.content;
        const thinking = (llmResponse.choices[0].message as any).reasoning_content;
        
        // Extract text from content (handle both string and array types)
        let response: string;
        if (typeof messageContent === 'string') {
          response = messageContent;
        } else if (Array.isArray(messageContent)) {
          // Extract text from content array
          response = messageContent
            .filter(item => item.type === 'text')
            .map(item => 'text' in item ? item.text : '')
            .join('');
        } else {
          response = "I'm having trouble responding right now. Could you try rephrasing that?";
        }
        
        if (!response) {
          response = "I'm having trouble responding right now. Could you try rephrasing that?";
        }
        
        // Save assistant message
        await conversationDb.createMessage({
          conversationId,
          role: 'assistant',
          content: response,
          model: 'claude-sonnet-4.5',
          tokensUsed: llmResponse.usage?.total_tokens,
        });

        // Increment usage counter
        await db.incrementUserGenerations(ctx.user.id);
        return {
          conversationId,
          response,
          thinking,
        };
      }),
  }),

  // Copy Patterns - product copy library
  patterns: router({
    // Create a new pattern
    create: protectedProcedure
      .input(
        z.object({
          componentType: z.enum([
            "button", "error", "success", "empty_state", "form_label",
            "tooltip", "navigation", "heading", "description", "placeholder",
            "modal_title", "modal_body", "notification", "onboarding", "cta"
          ]),
          text: z.string().min(1),
          context: z.string().optional(),
          source: z.enum(["manual", "imported", "accepted_suggestion", "codebase"]).default("manual"),
          projectId: z.number().optional(),
          abTestWinner: z.boolean().optional(),
          conversionLift: z.string().optional(), // Decimal stored as string
          userResearchValidated: z.boolean().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const patternDb = await import("./patternDb");
        const id = await patternDb.createPattern({
          userId: ctx.user.id,
          ...input,
        });
        return { id };
      }),

    // List patterns with optional filters
    list: protectedProcedure
      .input(
        z.object({
          componentType: z.enum([
            "button", "error", "success", "empty_state", "form_label",
            "tooltip", "navigation", "heading", "description", "placeholder",
            "modal_title", "modal_body", "notification", "onboarding", "cta"
          ]).optional(),
          projectId: z.number().optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        const patternDb = await import("./patternDb");
        return patternDb.listPatterns({
          userId: ctx.user.id,
          componentType: input?.componentType,
          projectId: input?.projectId,
          limit: input?.limit ?? 50,
          offset: input?.offset ?? 0,
        });
      }),

    // Search patterns by text (semantic search)
    search: protectedProcedure
      .input(
        z.object({
          query: z.string().min(1),
          componentType: z.enum([
            "button", "error", "success", "empty_state", "form_label",
            "tooltip", "navigation", "heading", "description", "placeholder",
            "modal_title", "modal_body", "notification", "onboarding", "cta"
          ]).optional(),
          limit: z.number().min(1).max(20).default(5),
        })
      )
      .query(async ({ ctx, input }) => {
        const patternDb = await import("./patternDb");
        return patternDb.searchPatterns({
          userId: ctx.user.id,
          query: input.query,
          componentType: input.componentType,
          limit: input.limit,
        });
      }),

    // Get a single pattern by ID
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const patternDb = await import("./patternDb");
        const pattern = await patternDb.getPattern(input.id);
        if (!pattern || pattern.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        return pattern;
      }),

    // Update a pattern
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          text: z.string().min(1).optional(),
          context: z.string().optional(),
          isApproved: z.boolean().optional(),
          abTestWinner: z.boolean().optional(),
          conversionLift: z.string().optional(), // Decimal stored as string
          userResearchValidated: z.boolean().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const patternDb = await import("./patternDb");
        const pattern = await patternDb.getPattern(input.id);
        if (!pattern || pattern.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        const { id, ...updates } = input;
        await patternDb.updatePattern(id, updates);
        return { success: true };
      }),

    // Delete a pattern
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const patternDb = await import("./patternDb");
        const pattern = await patternDb.getPattern(input.id);
        if (!pattern || pattern.userId !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        await patternDb.deletePattern(input.id);
        return { success: true };
      }),

    // Import patterns from CSV/JSON
    import: protectedProcedure
      .input(
        z.object({
          patterns: z.array(
            z.object({
              componentType: z.enum([
                "button", "error", "success", "empty_state", "form_label",
                "tooltip", "navigation", "heading", "description", "placeholder",
                "modal_title", "modal_body", "notification", "onboarding", "cta"
              ]),
              text: z.string().min(1),
              context: z.string().optional(),
              notes: z.string().optional(),
            })
          ),
          projectId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const patternDb = await import("./patternDb");
        const ids = await patternDb.importPatterns(
          input.patterns.map(p => ({
            ...p,
            userId: ctx.user.id,
            projectId: input.projectId,
            source: "imported" as const,
          }))
        );
        return { imported: ids.length, ids };
      }),

    // Get pattern stats
    stats: protectedProcedure.query(async ({ ctx }) => {
      const patternDb = await import("./patternDb");
      return patternDb.getPatternStats(ctx.user.id);
    }),
  }),

  // Admin endpoints
  admin: router({
    users: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.getAllUsers();
    }),

    stats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [totalUsers, totalGenerations] = await Promise.all([db.getTotalUsers(), db.getTotalGenerations()]);

      return {
        totalUsers,
        totalGenerations,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
