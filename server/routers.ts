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
        });

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
