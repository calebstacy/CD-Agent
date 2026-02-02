import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
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
  chat: router({ send: protectedProcedure
      .input(
        z.object({
          message: z.string().min(1),
          conversationHistory: z.array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          ).optional(),
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

        // TODO: Integrate with Python RAG system
        // For now, return a placeholder response
        const response = "This is where the conversational RAG system will respond. Integration coming soon!";

        // Increment usage counter
        await db.incrementUserGenerations(ctx.user.id);

        return {
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
