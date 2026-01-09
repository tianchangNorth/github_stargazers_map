import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(githubToken?: string): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    githubToken: githubToken || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("settings.getGithubToken", () => {
  it("returns hasToken=false when user has no token", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.getGithubToken();

    expect(result).toEqual({
      hasToken: false,
      token: null,
    });
  });

  it("returns hasToken=true and masked token when user has token", async () => {
    const { ctx } = createAuthContext("ghp_1234567890abcdef");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.getGithubToken();

    expect(result.hasToken).toBe(true);
    expect(result.token).toBe("***cdef");
  });
});

describe("GitHub API with token", () => {
  it("should accept token parameter in fetchRepository", async () => {
    const { fetchRepository } = await import("./github");
    
    // This test verifies the function signature accepts token
    // Actual API call would require network access
    expect(fetchRepository).toBeDefined();
    expect(fetchRepository.length).toBe(3); // owner, repo, token
  });

  it("should accept token parameter in fetchUserDetail", async () => {
    const { fetchUserDetail } = await import("./github");
    
    expect(fetchUserDetail).toBeDefined();
    expect(fetchUserDetail.length).toBe(2); // username, token
  });

  it("should accept token parameter in checkRateLimit", async () => {
    const { checkRateLimit } = await import("./github");
    
    expect(checkRateLimit).toBeDefined();
    expect(checkRateLimit.length).toBe(1); // token
  });
});
