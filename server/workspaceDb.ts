import { eq, and, desc, like, or, isNull, sql } from "drizzle-orm";
import { getDb } from "./db";
import { 
  workspaces, workspaceMembers, knowledgeDocuments, knowledgeChunks,
  InsertWorkspace, InsertWorkspaceMember, InsertKnowledgeDocument, InsertKnowledgeChunk
} from "../drizzle/schema";

// ============ WORKSPACES ============

export async function createWorkspace(data: InsertWorkspace) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workspaces).values(data);
  return { id: result[0].insertId };
}

export async function getWorkspaceById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(workspaces).where(eq(workspaces.id, id));
  return result[0] || null;
}

export async function getWorkspaceBySlug(slug: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(workspaces).where(eq(workspaces.slug, slug));
  return result[0] || null;
}

export async function listWorkspacesForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get workspaces where user is owner or member, plus public workspaces
  const memberWorkspaceIds = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId));
  
  const memberIds = memberWorkspaceIds.map(m => m.workspaceId);
  
  const result = await db
    .select()
    .from(workspaces)
    .where(
      and(
        eq(workspaces.isArchived, false),
        or(
          eq(workspaces.ownerId, userId),
          eq(workspaces.isPublic, true),
          memberIds.length > 0 ? sql`${workspaces.id} IN (${sql.join(memberIds, sql`, `)})` : sql`FALSE`
        )
      )
    )
    .orderBy(desc(workspaces.updatedAt));
  
  return result;
}

export async function updateWorkspace(id: number, data: Partial<InsertWorkspace>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workspaces).set(data).where(eq(workspaces.id, id));
}

export async function deleteWorkspace(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workspaces).set({ isArchived: true }).where(eq(workspaces.id, id));
}

// Get workspace with its parent chain for inheritance
export async function getWorkspaceWithAncestors(id: number): Promise<typeof workspaces.$inferSelect[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result: typeof workspaces.$inferSelect[] = [];
  
  let currentId: number | null = id;
  while (currentId) {
    const workspace = await db.select().from(workspaces).where(eq(workspaces.id, currentId));
    if (workspace[0]) {
      result.push(workspace[0]);
      currentId = workspace[0].parentId;
    } else {
      break;
    }
  }
  
  return result;
}

// ============ WORKSPACE MEMBERS ============

export async function addWorkspaceMember(data: InsertWorkspaceMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workspaceMembers).values(data);
  return { id: result[0].insertId };
}

export async function listWorkspaceMembers(workspaceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId));
}

export async function removeWorkspaceMember(workspaceId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(workspaceMembers).where(
    and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId)
    )
  );
}

export async function getUserWorkspaceRole(workspaceId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if owner
  const workspace = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId));
  if (workspace[0]?.ownerId === userId) return "owner";
  
  // Check membership
  const member = await db.select().from(workspaceMembers).where(
    and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId)
    )
  );
  
  return member[0]?.role || null;
}

// ============ KNOWLEDGE DOCUMENTS ============

export async function createKnowledgeDocument(data: InsertKnowledgeDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(knowledgeDocuments).values(data);
  return { id: result[0].insertId };
}

export async function getKnowledgeDocumentById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));
  return result[0] || null;
}

export async function listKnowledgeDocuments(workspaceId: number, category?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conditions = [
    eq(knowledgeDocuments.workspaceId, workspaceId),
    eq(knowledgeDocuments.isActive, true)
  ];
  
  if (category) {
    conditions.push(eq(knowledgeDocuments.category, category as any));
  }
  
  return db
    .select()
    .from(knowledgeDocuments)
    .where(and(...conditions))
    .orderBy(desc(knowledgeDocuments.updatedAt));
}

export async function updateKnowledgeDocument(id: number, data: Partial<InsertKnowledgeDocument>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(knowledgeDocuments).set(data).where(eq(knowledgeDocuments.id, id));
}

export async function deleteKnowledgeDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(knowledgeDocuments).set({ isActive: false }).where(eq(knowledgeDocuments.id, id));
}

// Get all knowledge documents for a workspace and its ancestors (for inheritance)
export async function getInheritedKnowledgeDocuments(workspaceId: number) {
  const ancestors = await getWorkspaceWithAncestors(workspaceId);
  const ancestorIds = ancestors.map(w => w.id);
  
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(knowledgeDocuments)
    .where(
      and(
        sql`${knowledgeDocuments.workspaceId} IN (${sql.join(ancestorIds, sql`, `)})`,
        eq(knowledgeDocuments.isActive, true)
      )
    )
    .orderBy(desc(knowledgeDocuments.updatedAt));
}

// ============ KNOWLEDGE CHUNKS ============

export async function createKnowledgeChunks(documentId: number, chunks: { content: string; chunkIndex: number; embedding?: number[] }[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (chunks.length === 0) return;
  
  const values = chunks.map(chunk => ({
    documentId,
    content: chunk.content,
    chunkIndex: chunk.chunkIndex,
    embedding: chunk.embedding || null,
  }));
  
  await db.insert(knowledgeChunks).values(values);
  
  // Update chunk count on document
  await db.update(knowledgeDocuments)
    .set({ chunkCount: chunks.length })
    .where(eq(knowledgeDocuments.id, documentId));
}

export async function getChunksForDocument(documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.documentId, documentId))
    .orderBy(knowledgeChunks.chunkIndex);
}

export async function deleteChunksForDocument(documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(knowledgeChunks).where(eq(knowledgeChunks.documentId, documentId));
}

// Search chunks by simple text matching (for now, can be upgraded to vector search)
export async function searchKnowledgeChunks(workspaceId: number, query: string, limit = 10) {
  const ancestors = await getWorkspaceWithAncestors(workspaceId);
  const ancestorIds = ancestors.map(w => w.id);
  
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get document IDs for this workspace and ancestors
  const docs = await db
    .select({ id: knowledgeDocuments.id })
    .from(knowledgeDocuments)
    .where(
      and(
        sql`${knowledgeDocuments.workspaceId} IN (${sql.join(ancestorIds, sql`, `)})`,
        eq(knowledgeDocuments.isActive, true)
      )
    );
  
  const docIds = docs.map(d => d.id);
  if (docIds.length === 0) return [];
  
  // Simple text search in chunks
  return db
    .select()
    .from(knowledgeChunks)
    .where(
      and(
        sql`${knowledgeChunks.documentId} IN (${sql.join(docIds, sql`, `)})`,
        like(knowledgeChunks.content, `%${query}%`)
      )
    )
    .limit(limit);
}
