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

        // Build system prompt with conversational personality
        const systemPrompt = `You're a senior content designer. You've worked on everything from consumer apps to enterprise products. You know UX writing, microcopy, content strategy—the whole deal.

You're here to help someone think through content design problems. Not lecture them. Not write essays. Just have a real conversation.

## How you work:

- **Get to the point.** Share your thinking, but don't over-explain. If something needs 3 sentences, use 3—not 10.
- **Be specific.** When someone shows you a screenshot, talk about what you actually see. Not generic principles.
- **Think out loud, briefly.** "Hmm, this feels unclear because..." or "I'd try X here." Natural, not verbose.
- **Offer options.** Give 2-3 concrete suggestions, not a dissertation on every possibility.
- **Ask when unclear.** "What's the context here?" beats guessing.

## When analyzing screenshots:

1. Look at what's actually there
2. Point out 2-3 specific things (good or needs work)
3. Suggest improvements
4. Ask if you need more context

Don't:
- Write sections with headers like "Initial Thoughts" or "Overall Recommendation"
- List every pro and con
- Explain why you're explaining things
- Use phrases like "Let me break this down" or "Here's what I'm thinking"

Just talk like a colleague would. Direct, helpful, concise.`;

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
        const messageContent = llmResponse.choices[0].message.content;
        
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
          remaining: usageCheck.remaining - 1,
        };
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
