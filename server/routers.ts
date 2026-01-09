import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { analyzeRepository } from "./analyzer";
import { createTask, getTaskStatus, cancelTask } from "./taskQueue";
import { getRepositoryByFullName, getCountryStatsByRepositoryId, getDb } from "./db";
import { checkRateLimit } from "./github";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  settings: router({
    /**
     * Get user's GitHub token
     */
    getGithubToken: protectedProcedure.query(async ({ ctx }) => {
      return {
        hasToken: !!ctx.user.githubToken,
        token: ctx.user.githubToken ? '***' + ctx.user.githubToken.slice(-4) : null,
      };
    }),

    /**
     * Save user's GitHub token
     */
    saveGithubToken: protectedProcedure
      .input(
        z.object({
          token: z.string().min(1, 'Token is required'),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) {
          throw new Error('Database not available');
        }

        await db
          .update(users)
          .set({ githubToken: input.token })
          .where(eq(users.id, ctx.user.id));

        return { success: true };
      }),

    /**
     * Delete user's GitHub token
     */
    deleteGithubToken: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      await db
        .update(users)
        .set({ githubToken: null })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),
  }),

  stargazers: router({
    /**
     * Analyze a GitHub repository's stargazers geographic distribution
     * Creates a background task for large repositories
     */
    analyze: publicProcedure
      .input(
        z.object({
          repoUrl: z.string().min(1, 'Repository URL is required'),
          maxStargazers: z.number().min(1).max(10000).default(10000),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Parse repo URL to get fullName
        const match = input.repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (!match) {
          throw new Error('Invalid GitHub repository URL');
        }
        const fullName = `${match[1]}/${match[2]}`;

        // Create background task
        const taskId = await createTask({
          userId: ctx.user?.id || null,
          repoUrl: input.repoUrl,
          fullName,
          maxStargazers: input.maxStargazers,
        });

        return { taskId };
      }),

    /**
     * Get analysis task status
     */
    getTaskStatus: publicProcedure
      .input(z.object({ taskId: z.number() }))
      .query(async ({ input }) => {
        const task = await getTaskStatus(input.taskId);
        if (!task) {
          throw new Error('Task not found');
        }
        return task;
      }),

    /**
     * Cancel an analysis task
     */
    cancelTask: publicProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ input }) => {
        await cancelTask(input.taskId);
        return { success: true };
      }),

    /**
     * Get cached analysis result for a repository
     */
    getAnalysis: publicProcedure
      .input(
        z.object({
          fullName: z.string().min(1),
        })
      )
      .query(async ({ input }) => {
        const repo = await getRepositoryByFullName(input.fullName);
        if (!repo) {
          return null;
        }

        const stats = await getCountryStatsByRepositoryId(repo.id);

        return {
          repositoryId: repo.id,
          fullName: repo.fullName,
          url: repo.url,
          starCount: repo.starCount,
          analyzedCount: repo.analyzedCount,
          unknownCount: repo.unknownCount,
          updatedAt: repo.updatedAt,
          countryDistribution: stats.map(s => ({
            countryCode: s.countryCode,
            countryName: s.countryName,
            count: s.count,
          })),
        };
      }),

    /**
     * Check GitHub API rate limit status
     */
    checkRateLimit: publicProcedure.query(async ({ ctx }) => {
      try {
        const githubToken = ctx.user?.githubToken || undefined;
        const rateLimit = await checkRateLimit(githubToken);
        return {
          success: true,
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset,
        };
      } catch (error) {
        return {
          success: false,
          error: 'Failed to check rate limit',
        };
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;
