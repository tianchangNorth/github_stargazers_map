import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { analyzeRepository } from "./analyzer";
import { getRepositoryByFullName, getCountryStatsByRepositoryId } from "./db";
import { checkRateLimit } from "./github";

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

  stargazers: router({
    /**
     * Analyze a GitHub repository's stargazers geographic distribution
     */
    analyze: publicProcedure
      .input(
        z.object({
          repoUrl: z.string().min(1, 'Repository URL is required'),
          maxStargazers: z.number().min(1).max(5000).default(1000),
        })
      )
      .mutation(async ({ input }) => {
        const result = await analyzeRepository(input.repoUrl, undefined, input.maxStargazers);
        return result;
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
    checkRateLimit: publicProcedure.query(async () => {
      try {
        const rateLimit = await checkRateLimit();
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
