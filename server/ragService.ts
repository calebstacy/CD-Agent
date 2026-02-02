/**
 * RAG Service - Vector embeddings and semantic search for knowledge documents
 * 
 * This service handles:
 * 1. Generating embeddings for knowledge document chunks
 * 2. Storing embeddings in the database
 * 3. Semantic search to find relevant context for generation
 */

import { getDb } from "./db";
import { knowledgeDocuments, knowledgeChunks, workspaces } from "../drizzle/schema";
import { eq, and, inArray, desc, sql } from "drizzle-orm";

// Simple in-memory vector store for demo (production would use pgvector or Pinecone)
const vectorStore: Map<number, number[]> = new Map();

/**
 * Generate embeddings using a simple TF-IDF-like approach
 * In production, replace with OpenAI/Anthropic embeddings API
 */
function generateEmbedding(text: string): number[] {
  // Normalize and tokenize
  const tokens = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 2);
  
  // Create a simple bag-of-words vector (768 dimensions to match common embedding sizes)
  const vector = new Array(768).fill(0);
  
  // Hash tokens to vector positions
  for (const token of tokens) {
    const hash = simpleHash(token) % 768;
    vector[hash] += 1;
  }
  
  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude;
    }
  }
  
  return vector;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Chunk a document into smaller pieces for embedding
 */
export function chunkDocument(content: string, chunkSize: number = 500, overlap: number = 100): string[] {
  const chunks: string[] = [];
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    if ((currentChunk + ' ' + trimmedSentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Keep overlap by taking last portion
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      currentChunk = overlapWords.join(' ') + ' ' + trimmedSentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Index a knowledge document - chunk it and generate embeddings
 */
export async function indexDocument(documentId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get the document
  const [doc] = await db
    .select()
    .from(knowledgeDocuments)
    .where(eq(knowledgeDocuments.id, documentId));
  
  if (!doc) throw new Error(`Document ${documentId} not found`);
  
  // Delete existing chunks
  await db
    .delete(knowledgeChunks)
    .where(eq(knowledgeChunks.documentId, documentId));
  
  // Chunk the document
  const chunks = chunkDocument(doc.content);
  
  // Create chunks with embeddings
  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
    const embedding = generateEmbedding(chunkText);
    
    const [inserted] = await db
      .insert(knowledgeChunks)
      .values({
        documentId,
        chunkIndex: i,
        content: chunkText,
        embedding: embedding, // JSON type in schema
      });
    
    // Store in memory for fast retrieval
    if (inserted.insertId) {
      vectorStore.set(Number(inserted.insertId), embedding);
    }
  }
  
  // Update document chunk count
  await db
    .update(knowledgeDocuments)
    .set({ 
      chunkCount: chunks.length,
      updatedAt: new Date(),
    })
    .where(eq(knowledgeDocuments.id, documentId));
}

/**
 * Load all embeddings into memory (call on server start)
 */
export async function loadEmbeddings(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const chunks = await db
    .select({ id: knowledgeChunks.id, embedding: knowledgeChunks.embedding })
    .from(knowledgeChunks)
    .where(sql`${knowledgeChunks.embedding} IS NOT NULL`);
  
  for (const chunk of chunks) {
    if (chunk.embedding) {
      try {
        const embedding = typeof chunk.embedding === 'string' 
          ? JSON.parse(chunk.embedding) 
          : chunk.embedding;
        vectorStore.set(chunk.id, embedding);
      } catch (e) {
        // Skip invalid embeddings
      }
    }
  }
  
  console.log(`[RAG] Loaded ${vectorStore.size} embeddings into memory`);
}

/**
 * Search for relevant knowledge chunks given a query
 */
export async function searchKnowledge(
  query: string,
  workspaceId: number,
  limit: number = 5
): Promise<Array<{
  content: string;
  documentTitle: string;
  documentType: string;
  similarity: number;
}>> {
  const db = await getDb();
  if (!db) return [];
  
  // Get workspace and its ancestors for inheritance
  const workspaceIds = await getWorkspaceHierarchy(workspaceId);
  
  // Get all chunks from relevant workspaces
  const chunks = await db
    .select({
      id: knowledgeChunks.id,
      content: knowledgeChunks.content,
      embedding: knowledgeChunks.embedding,
      documentId: knowledgeChunks.documentId,
    })
    .from(knowledgeChunks)
    .innerJoin(knowledgeDocuments, eq(knowledgeChunks.documentId, knowledgeDocuments.id))
    .where(
      and(
        inArray(knowledgeDocuments.workspaceId, workspaceIds),
        eq(knowledgeDocuments.isActive, true)
      )
    );
  
  // Generate query embedding
  const queryEmbedding = generateEmbedding(query);
  
  // Calculate similarities
  const results: Array<{
    chunkId: number;
    content: string;
    documentId: number;
    similarity: number;
  }> = [];
  
  for (const chunk of chunks) {
    let embedding: number[];
    
    // Try memory first, then parse from DB
    if (vectorStore.has(chunk.id)) {
      embedding = vectorStore.get(chunk.id)!;
    } else if (chunk.embedding) {
      try {
        embedding = typeof chunk.embedding === 'string' 
          ? JSON.parse(chunk.embedding) 
          : chunk.embedding as number[];
        vectorStore.set(chunk.id, embedding);
      } catch {
        continue;
      }
    } else {
      continue;
    }
    
    const similarity = cosineSimilarity(queryEmbedding, embedding);
    
    results.push({
      chunkId: chunk.id,
      content: chunk.content,
      documentId: chunk.documentId,
      similarity,
    });
  }
  
  // Sort by similarity and take top results
  results.sort((a, b) => b.similarity - a.similarity);
  const topResults = results.slice(0, limit);
  
  // Get document metadata
  const documentIds = Array.from(new Set(topResults.map(r => r.documentId)));
  const documents = documentIds.length > 0 
    ? await db
        .select({ id: knowledgeDocuments.id, title: knowledgeDocuments.title, category: knowledgeDocuments.category })
        .from(knowledgeDocuments)
        .where(inArray(knowledgeDocuments.id, documentIds))
    : [];
  
  const docMap = new Map(documents.map(d => [d.id, d]));
  
  return topResults.map(r => ({
    content: r.content,
    documentTitle: docMap.get(r.documentId)?.title || 'Unknown',
    documentType: docMap.get(r.documentId)?.category || 'other',
    similarity: r.similarity,
  }));
}

/**
 * Get workspace hierarchy (current + all ancestors) for inheritance
 */
async function getWorkspaceHierarchy(workspaceId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [workspaceId];
  
  const hierarchy: number[] = [workspaceId];
  let currentId: number | null = workspaceId;
  
  while (currentId) {
    const [workspace] = await db
      .select({ parentId: workspaces.parentId })
      .from(workspaces)
      .where(eq(workspaces.id, currentId));
    
    if (workspace?.parentId) {
      hierarchy.push(workspace.parentId);
      currentId = workspace.parentId;
    } else {
      currentId = null;
    }
  }
  
  return hierarchy;
}

/**
 * Get relevant context for content generation
 * Combines RAG search with pattern library
 */
export async function getGenerationContext(
  query: string,
  workspaceId: number
): Promise<string> {
  // Search knowledge base
  const knowledgeResults = await searchKnowledge(query, workspaceId, 3);
  
  if (knowledgeResults.length === 0) {
    return '';
  }
  
  // Format context
  let context = '\n\n--- RELEVANT KNOWLEDGE FROM YOUR STYLE GUIDE ---\n';
  
  for (const result of knowledgeResults) {
    if (result.similarity > 0.1) { // Only include if reasonably relevant
      context += `\n[${result.documentType.toUpperCase()}: ${result.documentTitle}]\n`;
      context += result.content + '\n';
    }
  }
  
  return context;
}
