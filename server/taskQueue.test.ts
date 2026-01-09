import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    githubToken: null,
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

describe("Task Queue", () => {
  it("creates a task when analyzing a repository", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.stargazers.analyze({
      repoUrl: "https://github.com/tj/commander.js",
      maxStargazers: 10,
    });

    expect(result).toHaveProperty("taskId");
    expect(typeof result.taskId).toBe("number");
    expect(result.taskId).toBeGreaterThan(0);
  });

  it("retrieves task status", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create a task
    const createResult = await caller.stargazers.analyze({
      repoUrl: "https://github.com/tj/commander.js",
      maxStargazers: 10,
    });

    // Get task status
    const status = await caller.stargazers.getTaskStatus({
      taskId: createResult.taskId,
    });

    expect(status).toBeDefined();
    expect(status.id).toBe(createResult.taskId);
    expect(status.repoUrl).toBe("https://github.com/tj/commander.js");
    expect(status.fullName).toBe("tj/commander.js");
    expect(status.maxStargazers).toBe(10);
    expect(["pending", "running", "completed", "failed", "cancelled"]).toContain(status.status);
  });

  it("cancels a task", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // Create a task
    const createResult = await caller.stargazers.analyze({
      repoUrl: "https://github.com/tj/commander.js",
      maxStargazers: 10,
    });

    // Cancel the task
    const cancelResult = await caller.stargazers.cancelTask({
      taskId: createResult.taskId,
    });

    expect(cancelResult.success).toBe(true);

    // Verify task is cancelled
    const status = await caller.stargazers.getTaskStatus({
      taskId: createResult.taskId,
    });

    expect(status.status).toBe("cancelled");
  });
});
