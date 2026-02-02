# Content Design AI - Manus Build Guide

This document tells Manus exactly how to build, extend, and maintain this content design AI system. It's written for AI agents, not humans.

---

## Project Overview

**What this is:** An AI-powered content design tool that generates UX copy (buttons, errors, empty states, etc.) grounded in domain-specific knowledge and proven patterns.

**Key differentiator:** Unlike generic AI writing tools, this system uses:
1. **RAG (Retrieval-Augmented Generation)** - Queries style guides, voice docs, and research to inform suggestions
2. **Pattern Library** - References A/B-tested, UXR-validated copy that's worked before
3. **Multi-tenant Workspaces** - Supports enterprise hierarchy (e.g., Meta → Reality Labs → Horizon)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  Chat.tsx → ThinkingSteps → ArtifactRenderer                │
│  WorkspaceSwitcher → PatternLibrary → ConversationSidebar   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     tRPC API Layer                           │
│  routers.ts: chat.send, patterns.*, workspaces.*            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                          │
│  ragService.ts    - Vector search for knowledge docs        │
│  patternDb.ts     - Pattern library CRUD + search           │
│  workspaceDb.ts   - Workspace hierarchy + knowledge mgmt    │
│  llm.ts           - Claude Sonnet 4.5 via Anthropic API     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database (MySQL)                        │
│  workspaces, knowledgeDocuments, knowledgeChunks            │
│  copyPatterns, conversations, messages, users               │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Files to Understand

### Backend (server/)

| File | Purpose | When to Modify |
|------|---------|----------------|
| `routers.ts` | All tRPC endpoints | Adding new API endpoints |
| `ragService.ts` | Vector embeddings + semantic search | Improving RAG accuracy |
| `patternDb.ts` | Pattern library database operations | Changing pattern schema |
| `workspaceDb.ts` | Workspace + knowledge doc operations | Adding workspace features |
| `_core/llm.ts` | Claude Sonnet 4.5 integration | Changing LLM provider |

### Frontend (client/src/)

| File | Purpose | When to Modify |
|------|---------|----------------|
| `pages/Chat.tsx` | Main chat interface | Changing chat UX |
| `components/ThinkingSteps.tsx` | Animated progress indicators | Adding new thinking steps |
| `components/ArtifactRenderer.tsx` | Copy option cards with iteration | Changing artifact display |
| `components/WorkspaceSwitcher.tsx` | Workspace dropdown | Changing workspace selection |
| `pages/PatternLibrary.tsx` | Pattern browser/manager | Adding pattern features |

### Database (drizzle/)

| Table | Purpose |
|-------|---------|
| `workspaces` | Domain containers with parent/child hierarchy |
| `knowledgeDocuments` | RAG source documents (style guides, research) |
| `knowledgeChunks` | Chunked + embedded content for semantic search |
| `copyPatterns` | Verified copy with A/B results, UXR validation |
| `conversations` | Chat session storage |
| `messages` | Individual messages with artifacts |

---

## How the Generation Flow Works

When a user asks for copy (e.g., "I need a button for saving"):

```
1. User sends message
   └─→ chat.send mutation in routers.ts

2. Detect task type from message
   └─→ ThinkingSteps.tsx shows contextual progress
   
3. Query RAG for relevant knowledge
   └─→ ragService.ts:searchKnowledge()
   └─→ Gets workspace hierarchy (Horizon → Reality Labs → Meta)
   └─→ Searches knowledgeChunks with cosine similarity
   └─→ Returns top 3 relevant passages

4. Query Pattern Library for similar patterns
   └─→ patternDb.ts:searchPatterns()
   └─→ Filters by componentType (button, error, etc.)
   └─→ Returns A/B winners and UXR-validated patterns

5. Build system prompt with context
   └─→ Injects RAG results as "RELEVANT KNOWLEDGE"
   └─→ Injects patterns as "EXISTING PATTERNS"
   └─→ Adds workspace-specific voice guidelines

6. Call Claude Sonnet 4.5
   └─→ _core/llm.ts:invokeLLM()
   └─→ Uses Anthropic API directly (not proxy)
   └─→ Returns structured copy options

7. Parse and render response
   └─→ parseArtifacts.ts extracts <artifact> blocks
   └─→ ArtifactRenderer.tsx displays options
   └─→ Each option shows: text, char count, copy button, iterate buttons
```

---

## How to Extend

### Adding a New Component Type

1. Update schema enum in `drizzle/schema.ts`:
```typescript
componentType: mysqlEnum("componentType", [
  "button", "label", "error", "success", "empty_state",
  "tooltip", "placeholder", "heading", "description",
  "navigation", "confirmation", "onboarding",
  "your_new_type"  // Add here
]).notNull(),
```

2. Run migration: `pnpm db:push`

3. Add thinking steps in `ThinkingSteps.tsx`:
```typescript
your_new_type: [
  "Step 1 for this type",
  "Step 2 for this type",
  "Step 3 for this type",
],
```

4. Seed example patterns in `scripts/seed-patterns.mjs`

### Adding a New Workspace

1. Insert via tRPC or SQL:
```typescript
await trpc.workspaces.create.mutate({
  name: "New Product",
  slug: "new-product",
  description: "Description here",
  parentId: 1, // Parent workspace ID for inheritance
});
```

2. Add knowledge documents:
```typescript
await trpc.workspaces.addKnowledgeDocument.mutate({
  workspaceId: newWorkspaceId,
  title: "Voice & Tone Guide",
  category: "voice_tone",
  content: "Full text of the guide...",
});
```

3. Index for RAG:
```typescript
import { indexDocument } from "./server/ragService";
await indexDocument(documentId);
```

### Improving RAG Quality

The current implementation uses a simple TF-IDF-like embedding. To upgrade:

1. Replace `generateEmbedding()` in `ragService.ts` with OpenAI/Anthropic embeddings:
```typescript
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });
  const data = await response.json();
  return data.data[0].embedding;
}
```

2. For production scale, migrate to pgvector or Pinecone:
```sql
-- Add vector column to knowledge_chunks
ALTER TABLE knowledge_chunks ADD COLUMN embedding_vector VECTOR(1536);
CREATE INDEX ON knowledge_chunks USING ivfflat (embedding_vector vector_cosine_ops);
```

### Adding New LLM Features

The LLM integration is in `server/_core/llm.ts`. Key points:

- Uses Anthropic API directly (not OpenAI proxy)
- Model: `claude-sonnet-4-5-20250929`
- System messages go in top-level `system` param, not messages array
- Response is transformed to OpenAI-compatible format

To add streaming:
```typescript
// In llm.ts, add stream option
if (options.stream) {
  payload.stream = true;
  // Return async iterator instead of full response
}
```

---

## Database Operations

### Push Schema Changes
```bash
pnpm db:push
```

### Seed Demo Data
```bash
node scripts/seed-patterns.mjs
node scripts/seed-workspaces.mjs
```

### Direct SQL Access
Use `webdev_execute_sql` tool or connect to DATABASE_URL.

---

## Testing

### Run All Tests
```bash
pnpm test
```

### Run Specific Tests
```bash
pnpm test patterns  # Pattern library tests
pnpm test ant       # Anthropic API tests
```

### Key Test Files
- `server/patterns.test.ts` - Pattern CRUD
- `server/anthropic.test.ts` - LLM integration
- `server/contentGeneration.test.ts` - Generation flow

---

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `ANTHROPIC_API_KEY` | Claude Sonnet 4.5 access | Yes |
| `DATABASE_URL` | MySQL connection string | Yes (auto-injected) |
| `JWT_SECRET` | Session signing | Yes (auto-injected) |

---

## Common Tasks

### "Add a new feature to chat"
1. Add tRPC endpoint in `routers.ts`
2. Add UI in `Chat.tsx` or new component
3. Wire with `trpc.*.useQuery/useMutation`

### "Change how artifacts look"
1. Edit `ArtifactRenderer.tsx`
2. Modify `CopyOption` component for individual options
3. Update iteration buttons in `IterateButton` component

### "Add new knowledge source"
1. Create document via `workspaces.addKnowledgeDocument`
2. Call `indexDocument()` to chunk and embed
3. RAG will automatically include in searches

### "Change the AI's personality"
1. Edit system prompt in `routers.ts` (search for "You are a senior content designer")
2. Modify voice guidelines in workspace knowledge docs

### "Debug why suggestions are bad"
1. Check RAG results: Add logging in `ragService.ts:searchKnowledge()`
2. Check pattern context: Add logging in `patternDb.ts:searchPatterns()`
3. Check full prompt: Log the messages array before `invokeLLM()`

---

## Production Considerations

### Scaling RAG
- Current: In-memory vector store, simple embeddings
- Production: Use pgvector, Pinecone, or Weaviate
- Add caching layer for frequently-accessed chunks

### Scaling Patterns
- Current: Full-text search with LIKE queries
- Production: Add Elasticsearch or Meilisearch for pattern search
- Consider embedding-based pattern similarity

### Multi-tenancy
- Current: Workspace isolation via foreign keys
- Production: Add row-level security policies
- Consider separate databases per enterprise customer

---

## File Structure Summary

```
content-design-ai/
├── client/src/
│   ├── pages/
│   │   ├── Chat.tsx              # Main chat interface
│   │   └── PatternLibrary.tsx    # Pattern browser
│   ├── components/
│   │   ├── ThinkingSteps.tsx     # Animated progress
│   │   ├── ArtifactRenderer.tsx  # Copy option cards
│   │   ├── WorkspaceSwitcher.tsx # Domain selector
│   │   └── ConversationSidebar.tsx # Chat history
│   └── lib/
│       └── parseArtifacts.ts     # Extract artifacts from response
├── server/
│   ├── routers.ts                # All tRPC endpoints
│   ├── ragService.ts             # Vector search
│   ├── patternDb.ts              # Pattern operations
│   ├── workspaceDb.ts            # Workspace operations
│   └── _core/
│       └── llm.ts                # Claude integration
├── drizzle/
│   └── schema.ts                 # Database tables
├── scripts/
│   ├── seed-patterns.mjs         # Demo patterns
│   └── seed-workspaces.mjs       # Demo workspaces
└── MANUS_BUILD_GUIDE.md          # This file
```

---

## Quick Reference

**Start dev server:** `pnpm dev`
**Run tests:** `pnpm test`
**Push DB changes:** `pnpm db:push`
**Build for production:** `pnpm build`

**Key tRPC endpoints:**
- `chat.send` - Generate copy
- `patterns.list` - Get patterns
- `patterns.create` - Save pattern
- `workspaces.list` - Get workspaces
- `workspaces.getKnowledge` - Get RAG docs

**Key React hooks:**
- `trpc.chat.send.useMutation()` - Send message
- `trpc.patterns.list.useQuery()` - Load patterns
- `trpc.workspaces.list.useQuery()` - Load workspaces
