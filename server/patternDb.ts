import { getDb } from "./db";
import { copyPatterns, type InsertCopyPattern, type CopyPattern } from "../drizzle/schema";
import { eq, and, desc, sql, like } from "drizzle-orm";

/**
 * Create a new copy pattern
 */
export async function createPattern(data: Omit<InsertCopyPattern, "id" | "createdAt" | "updatedAt">): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(copyPatterns).values(data);
  return result[0].insertId;
}

/**
 * Get a pattern by ID
 */
export async function getPattern(id: number): Promise<CopyPattern | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const results = await db.select().from(copyPatterns).where(eq(copyPatterns.id, id));
  return results[0];
}

/**
 * List patterns with optional filters
 */
export async function listPatterns(opts: {
  userId: number;
  componentType?: string;
  projectId?: number;
  limit: number;
  offset: number;
}): Promise<CopyPattern[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(copyPatterns.userId, opts.userId)];
  
  if (opts.componentType) {
    conditions.push(eq(copyPatterns.componentType, opts.componentType as any));
  }
  if (opts.projectId) {
    conditions.push(eq(copyPatterns.projectId, opts.projectId));
  }

  return db
    .select()
    .from(copyPatterns)
    .where(and(...conditions))
    .orderBy(desc(copyPatterns.usageCount), desc(copyPatterns.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);
}

/**
 * Search patterns by text (simple text search for now)
 * TODO: Implement semantic search with embeddings
 */
export async function searchPatterns(opts: {
  userId: number;
  query: string;
  componentType?: string;
  limit: number;
}): Promise<CopyPattern[]> {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [
    eq(copyPatterns.userId, opts.userId),
    like(copyPatterns.text, `%${opts.query}%`),
  ];
  
  if (opts.componentType) {
    conditions.push(eq(copyPatterns.componentType, opts.componentType as any));
  }

  return db
    .select()
    .from(copyPatterns)
    .where(and(...conditions))
    .orderBy(desc(copyPatterns.usageCount))
    .limit(opts.limit);
}

/**
 * Find similar patterns for a given component type and context
 * Used to provide context to the AI during generation
 */
export async function findSimilarPatterns(opts: {
  userId: number;
  componentType: string;
  limit?: number;
}): Promise<CopyPattern[]> {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(copyPatterns)
    .where(
      and(
        eq(copyPatterns.userId, opts.userId),
        eq(copyPatterns.componentType, opts.componentType as any),
        eq(copyPatterns.isApproved, true)
      )
    )
    .orderBy(desc(copyPatterns.usageCount), desc(copyPatterns.createdAt))
    .limit(opts.limit ?? 10);
}

/**
 * Update a pattern
 */
export async function updatePattern(
  id: number,
  data: Partial<Omit<InsertCopyPattern, "id" | "userId" | "createdAt">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(copyPatterns).set(data).where(eq(copyPatterns.id, id));
}

/**
 * Delete a pattern
 */
export async function deletePattern(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(copyPatterns).where(eq(copyPatterns.id, id));
}

/**
 * Increment usage count for a pattern
 */
export async function incrementUsage(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(copyPatterns)
    .set({
      usageCount: sql`${copyPatterns.usageCount} + 1`,
      lastUsedAt: new Date(),
    })
    .where(eq(copyPatterns.id, id));
}

/**
 * Import multiple patterns at once
 */
export async function importPatterns(
  patterns: Array<Omit<InsertCopyPattern, "id" | "createdAt" | "updatedAt">>
): Promise<number[]> {
  if (patterns.length === 0) return [];
  
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.insert(copyPatterns).values(patterns);
  // Return array of IDs starting from insertId
  const startId = result[0].insertId;
  return patterns.map((_, i) => startId + i);
}

/**
 * Get pattern statistics for a user
 */
export async function getPatternStats(userId: number): Promise<{
  total: number;
  byType: Record<string, number>;
  abTestWinners: number;
  userResearchValidated: number;
}> {
  const db = await getDb();
  if (!db) return { total: 0, byType: {}, abTestWinners: 0, userResearchValidated: 0 };
  
  const allPatterns = await db
    .select()
    .from(copyPatterns)
    .where(eq(copyPatterns.userId, userId));

  const byType: Record<string, number> = {};
  let abTestWinners = 0;
  let userResearchValidated = 0;

  for (const pattern of allPatterns) {
    byType[pattern.componentType] = (byType[pattern.componentType] || 0) + 1;
    if (pattern.abTestWinner) abTestWinners++;
    if (pattern.userResearchValidated) userResearchValidated++;
  }

  return {
    total: allPatterns.length,
    byType,
    abTestWinners,
    userResearchValidated,
  };
}

/**
 * Get patterns formatted as context for AI prompts
 */
export async function getPatternsAsContext(opts: {
  userId: number;
  componentType: string;
  limit?: number;
}): Promise<string> {
  const patterns = await findSimilarPatterns({
    userId: opts.userId,
    componentType: opts.componentType,
    limit: opts.limit ?? 5,
  });

  if (patterns.length === 0) {
    return "";
  }

  const lines = patterns.map((p, i) => {
    let line = `${i + 1}. "${p.text}"`;
    if (p.context) line += ` (${p.context})`;
    if (p.abTestWinner) line += " [A/B winner]";
    if (p.userResearchValidated) line += " [UXR validated]";
    return line;
  });

  return `\n\nExisting ${opts.componentType} patterns from this product:\n${lines.join("\n")}`;
}
