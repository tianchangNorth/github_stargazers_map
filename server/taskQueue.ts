import { eq, and } from "drizzle-orm";
import { analysisTasks, users, type InsertAnalysisTask } from "../drizzle/schema";
import { getDb } from "./db";
import { analyzeRepository, type AnalysisProgress } from "./analyzer";

/**
 * Task queue manager for background analysis jobs
 */

// In-memory map to track cancellation requests
const cancellationRequests = new Map<number, boolean>();

/**
 * Create a new analysis task
 */
export async function createTask(task: InsertAnalysisTask): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(analysisTasks).values(task);
  const taskId = Number(result[0].insertId);

  // Start processing in background
  processTask(taskId).catch((error) => {
    console.error(`[TaskQueue] Error processing task ${taskId}:`, error);
  });

  return taskId;
}

/**
 * Get task status by ID
 */
export async function getTaskStatus(taskId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .select()
    .from(analysisTasks)
    .where(eq(analysisTasks.id, taskId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Update task progress
 */
async function updateTaskProgress(
  taskId: number,
  progress: number,
  currentStep: string
) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(analysisTasks)
    .set({
      progress,
      currentStep,
      updatedAt: new Date(),
    })
    .where(eq(analysisTasks.id, taskId));
}

/**
 * Mark task as completed
 */
async function completeTask(taskId: number, repositoryId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(analysisTasks)
    .set({
      status: "completed",
      progress: 100,
      repositoryId,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(analysisTasks.id, taskId));
}

/**
 * Mark task as failed
 */
async function failTask(taskId: number, errorMessage: string) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(analysisTasks)
    .set({
      status: "failed",
      errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(analysisTasks.id, taskId));
}

/**
 * Cancel a task
 */
export async function cancelTask(taskId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Mark for cancellation
  cancellationRequests.set(taskId, true);

  // Update database
  await db
    .update(analysisTasks)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(analysisTasks.id, taskId));
}

/**
 * Check if task is cancelled
 */
function isCancelled(taskId: number): boolean {
  return cancellationRequests.get(taskId) === true;
}

/**
 * Process a task in the background
 */
async function processTask(taskId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    // Get task details
    const task = await getTaskStatus(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Check if already cancelled
    if (isCancelled(taskId)) {
      console.log(`[TaskQueue] Task ${taskId} was cancelled before starting`);
      return;
    }

    // Update status to running
    await db
      .update(analysisTasks)
      .set({
        status: "running",
        progress: 0,
        currentStep: "Starting analysis...",
        updatedAt: new Date(),
      })
      .where(eq(analysisTasks.id, taskId));

    // Get user's GitHub token if available
    let githubToken: string | undefined;
    if (task.userId) {
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, task.userId))
        .limit(1);
      githubToken = userResult[0]?.githubToken || undefined;
    }

    // Create progress callback
    const onProgress = (progress: AnalysisProgress) => {
      if (isCancelled(taskId)) {
        throw new Error("Task cancelled by user");
      }

      const progressPercent = Math.floor((progress.processed / progress.total) * 100);
      updateTaskProgress(taskId, progressPercent, progress.message).catch(console.error);
    };

    // Run analysis
    const result = await analyzeRepository(
      task.repoUrl,
      onProgress,
      task.maxStargazers,
      githubToken
    );

    // Check if cancelled during analysis
    if (isCancelled(taskId)) {
      console.log(`[TaskQueue] Task ${taskId} was cancelled during analysis`);
      return;
    }

    // Mark as completed
    await completeTask(taskId, result.repositoryId);

    // Clean up cancellation flag
    cancellationRequests.delete(taskId);

    console.log(`[TaskQueue] Task ${taskId} completed successfully`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check if it was a cancellation
    if (errorMessage.includes("cancelled")) {
      console.log(`[TaskQueue] Task ${taskId} was cancelled`);
      cancellationRequests.delete(taskId);
    } else {
      console.error(`[TaskQueue] Task ${taskId} failed:`, errorMessage);
      await failTask(taskId, errorMessage);
    }
  }
}
