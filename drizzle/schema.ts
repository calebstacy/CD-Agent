import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, decimal } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  
  // Billing
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "pro", "team", "business", "enterprise"]).default("free").notNull(),
  subscriptionStatus: mysqlEnum("subscriptionStatus", ["active", "canceled", "past_due", "trialing"]),
  subscriptionId: varchar("subscriptionId", { length: 255 }),
  currentPeriodEnd: timestamp("currentPeriodEnd"),
  
  // Usage tracking
  generationsThisMonth: int("generationsThisMonth").default(0).notNull(),
  generationsTotal: int("generationsTotal").default(0).notNull(),
  lastResetDate: timestamp("lastResetDate").defaultNow().notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  generations: many(generations),
  teamMemberships: many(teamMembers),
  ownedTeams: many(teams),
}));

/**
 * Teams for collaboration
 */
export const teams = mysqlTable("teams", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  ownerId: int("ownerId").notNull(),
  
  // Shared brand voice
  brandVoicePreset: text("brandVoicePreset"),
  brandVoiceCustom: text("brandVoiceCustom"),
  brandGuidelines: text("brandGuidelines"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, {
    fields: [teams.ownerId],
    references: [users.id],
  }),
  members: many(teamMembers),
  projects: many(projects),
}));

/**
 * Team members
 */
export const teamMembers = mysqlTable("team_members", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "member"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
}));

/**
 * Projects for organizing content
 */
export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  userId: int("userId").notNull(),
  teamId: int("teamId"),
  
  // Brand voice for this project
  brandVoice: text("brandVoice"),
  
  // Project settings
  isArchived: boolean("isArchived").default(false).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [projects.teamId],
    references: [teams.id],
  }),
  generations: many(generations),
}));

/**
 * Content generations
 */
export const generations = mysqlTable("generations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  
  // Generation input
  contentType: mysqlEnum("contentType", [
    "button",
    "error",
    "success",
    "empty_state",
    "form_label",
    "tooltip",
    "navigation",
    "heading",
    "description",
    "placeholder"
  ]).notNull(),
  purpose: text("purpose").notNull(),
  context: text("context"),
  brandVoice: text("brandVoice"),
  
  // Generation output
  suggestions: json("suggestions").$type<Array<{ copy: string; rationale: string }>>().notNull(),
  selectedSuggestion: text("selectedSuggestion"),
  
  // Metadata
  model: varchar("model", { length: 100 }),
  tokensUsed: int("tokensUsed"),
  
  // Favorites and library
  isFavorite: boolean("isFavorite").default(false).notNull(),
  isInLibrary: boolean("isInLibrary").default(false).notNull(),
  tags: json("tags").$type<string[]>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const generationsRelations = relations(generations, ({ one }) => ({
  user: one(users, {
    fields: [generations.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [generations.projectId],
    references: [projects.id],
  }),
}));

/**
 * Usage analytics
 */
export const usageAnalytics = mysqlTable("usage_analytics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  teamId: int("teamId"),
  
  date: timestamp("date").notNull(),
  generationsCount: int("generationsCount").default(0).notNull(),
  
  // Breakdown by content type
  contentTypeBreakdown: json("contentTypeBreakdown").$type<Record<string, number>>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const usageAnalyticsRelations = relations(usageAnalytics, ({ one }) => ({
  user: one(users, {
    fields: [usageAnalytics.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [usageAnalytics.teamId],
    references: [teams.id],
  }),
}));

/**
 * Design Systems - stores brand design system information
 */
export const designSystems = mysqlTable("design_systems", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  
  // Design tokens
  colors: json("colors").$type<Record<string, string>>(), // { primary: "#6366f1", secondary: "#8b5cf6" }
  typography: json("typography").$type<{
    fontFamily?: string;
    headingSizes?: Record<string, string>;
    bodySizes?: Record<string, string>;
  }>(),
  spacing: json("spacing").$type<Record<string, string>>(), // { sm: "8px", md: "16px" }
  
  // Source information
  sourceType: mysqlEnum("sourceType", ["figma", "upload", "manual"]),
  sourceUrl: text("sourceUrl"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const designSystemsRelations = relations(designSystems, ({ one, many }) => ({
  user: one(users, {
    fields: [designSystems.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [designSystems.projectId],
    references: [projects.id],
  }),
  componentLibraries: many(componentLibraries),
  brandVoiceProfiles: many(brandVoiceProfiles),
  contentExamples: many(contentExamples),
}));

/**
 * Component Libraries - stores UI component definitions
 */
export const componentLibraries = mysqlTable("component_libraries", {
  id: int("id").autoincrement().primaryKey(),
  designSystemId: int("designSystemId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["button", "input", "card", "modal", "alert", "custom"]).notNull(),
  
  // Component variants and properties
  variants: json("variants").$type<Array<{
    name: string;
    properties?: Record<string, any>;
    characterLimit?: number;
    description?: string;
  }>>(),
  
  // Usage guidelines
  guidelines: text("guidelines"),
  examples: json("examples").$type<Array<{ variant: string; text: string; context: string }>>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const componentLibrariesRelations = relations(componentLibraries, ({ one }) => ({
  designSystem: one(designSystems, {
    fields: [componentLibraries.designSystemId],
    references: [designSystems.id],
  }),
}));

/**
 * Brand Voice Profiles - AI-learned brand voice characteristics
 */
export const brandVoiceProfiles = mysqlTable("brand_voice_profiles", {
  id: int("id").autoincrement().primaryKey(),
  designSystemId: int("designSystemId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  
  // Voice characteristics
  tone: json("tone").$type<string[]>(), // ["friendly", "professional", "concise"]
  vocabulary: json("vocabulary").$type<{
    preferred?: string[];
    avoid?: string[];
    terminology?: Record<string, string>;
  }>(),
  patterns: json("patterns").$type<{
    sentenceStructure?: string;
    punctuation?: string;
    capitalization?: string;
  }>(),
  
  // AI-generated insights
  aiAnalysis: text("aiAnalysis"),
  confidence: int("confidence"), // 0-100
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const brandVoiceProfilesRelations = relations(brandVoiceProfiles, ({ one }) => ({
  designSystem: one(designSystems, {
    fields: [brandVoiceProfiles.designSystemId],
    references: [designSystems.id],
  }),
}));

/**
 * Content Examples - existing product copy for learning
 */
export const contentExamples = mysqlTable("content_examples", {
  id: int("id").autoincrement().primaryKey(),
  designSystemId: int("designSystemId").notNull(),
  
  type: mysqlEnum("type", [
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
    "other"
  ]).notNull(),
  text: text("text").notNull(),
  context: text("context"),
  componentVariant: varchar("componentVariant", { length: 100 }),
  
  // Source tracking
  sourceUrl: text("sourceUrl"),
  screenshot: text("screenshot"), // S3 URL
  
  // Quality indicators
  isApproved: boolean("isApproved").default(true).notNull(),
  rating: int("rating"), // 1-5
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const contentExamplesRelations = relations(contentExamples, ({ one }) => ({
  designSystem: one(designSystems, {
    fields: [contentExamples.designSystemId],
    references: [designSystems.id],
  }),
}));

/**
 * Conversations - chat conversation sessions
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }),
  
  // Conversation metadata
  designSystemId: int("designSystemId"),
  projectId: int("projectId"),
  
  // Status
  isArchived: boolean("isArchived").default(false).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  designSystem: one(designSystems, {
    fields: [conversations.designSystemId],
    references: [designSystems.id],
  }),
  project: one(projects, {
    fields: [conversations.projectId],
    references: [projects.id],
  }),
  messages: many(messages),
}));

/**
 * Messages - individual messages in conversations
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  
  // Message content
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  images: json("images").$type<Array<{ url: string; alt?: string }>>(),
  
  // Metadata
  model: varchar("model", { length: 100 }),
  tokensUsed: int("tokensUsed"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

/**
 * Copy Patterns - product copy library for grounding AI suggestions
 */
export const copyPatterns = mysqlTable("copy_patterns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  projectId: int("projectId"),
  workspaceId: int("workspaceId"),
  
  // Pattern content
  componentType: mysqlEnum("componentType", [
    "button", "error", "success", "empty_state", "form_label",
    "tooltip", "navigation", "heading", "description", "placeholder",
    "modal_title", "modal_body", "notification", "onboarding", "cta"
  ]).notNull(),
  text: text("text").notNull(),
  context: text("context"), // Where/when this copy is used
  
  // Source and validation
  source: mysqlEnum("source", ["manual", "imported", "accepted_suggestion", "codebase"]).default("manual").notNull(),
  isApproved: boolean("isApproved").default(true).notNull(),
  
  // Success metrics (optional)
  abTestWinner: boolean("abTestWinner"),
  conversionLift: decimal("conversionLift", { precision: 5, scale: 2 }), // e.g., 12.50%
  userResearchValidated: boolean("userResearchValidated"),
  notes: text("notes"),
  
  // Usage tracking
  usageCount: int("usageCount").default(0).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  
  // Embedding for semantic search (stored as JSON array of floats)
  embedding: json("embedding").$type<number[]>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const copyPatternsRelations = relations(copyPatterns, ({ one }) => ({
  user: one(users, {
    fields: [copyPatterns.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [copyPatterns.projectId],
    references: [projects.id],
  }),
}));

/**
 * Workspaces - domain-specific knowledge containers (e.g., Horizon, Instagram)
 */
export const workspaces = mysqlTable("workspaces", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }), // emoji or icon name
  color: varchar("color", { length: 20 }), // hex color for UI
  
  // Hierarchy - allows inheritance (e.g., Horizon inherits from Meta Foundation)
  parentId: int("parentId"),
  
  // Owner
  ownerId: int("ownerId").notNull(),
  
  // Settings
  isPublic: boolean("isPublic").default(false).notNull(), // visible to all org members
  isArchived: boolean("isArchived").default(false).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  parent: one(workspaces, {
    fields: [workspaces.parentId],
    references: [workspaces.id],
  }),
  members: many(workspaceMembers),
  knowledgeDocuments: many(knowledgeDocuments),
  patterns: many(copyPatterns),
}));

/**
 * Workspace Members - access control for workspaces
 */
export const workspaceMembers = mysqlTable("workspace_members", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "admin", "editor", "viewer"]).default("viewer").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
}));

/**
 * Knowledge Documents - RAG documents for living guidance per workspace
 */
export const knowledgeDocuments = mysqlTable("knowledge_documents", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  
  // Document info
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", [
    "style_guide", "voice_tone", "terminology", "research",
    "best_practices", "component_guidelines", "accessibility", "other"
  ]).notNull(),
  
  // Content
  content: text("content").notNull(), // Full text content for RAG
  sourceUrl: text("sourceUrl"), // Original document URL
  sourceType: mysqlEnum("sourceType", ["upload", "url", "manual"]).default("manual").notNull(),
  
  // Metadata
  version: varchar("version", { length: 50 }), // e.g., "v2.1" for style guide versions
  lastReviewedAt: timestamp("lastReviewedAt"),
  reviewedBy: int("reviewedBy"),
  
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  
  // Chunking for RAG
  chunkCount: int("chunkCount").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const knowledgeDocumentsRelations = relations(knowledgeDocuments, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [knowledgeDocuments.workspaceId],
    references: [workspaces.id],
  }),
  reviewer: one(users, {
    fields: [knowledgeDocuments.reviewedBy],
    references: [users.id],
  }),
  chunks: many(knowledgeChunks),
}));

/**
 * Knowledge Chunks - RAG chunks for semantic search
 */
export const knowledgeChunks = mysqlTable("knowledge_chunks", {
  id: int("id").autoincrement().primaryKey(),
  documentId: int("documentId").notNull(),
  
  // Chunk content
  content: text("content").notNull(),
  chunkIndex: int("chunkIndex").notNull(), // Order within document
  
  // Embedding for semantic search
  embedding: json("embedding").$type<number[]>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const knowledgeChunksRelations = relations(knowledgeChunks, ({ one }) => ({
  document: one(knowledgeDocuments, {
    fields: [knowledgeChunks.documentId],
    references: [knowledgeDocuments.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type Generation = typeof generations.$inferSelect;
export type InsertGeneration = typeof generations.$inferInsert;
export type UsageAnalytics = typeof usageAnalytics.$inferSelect;
export type InsertUsageAnalytics = typeof usageAnalytics.$inferInsert;
export type DesignSystem = typeof designSystems.$inferSelect;
export type InsertDesignSystem = typeof designSystems.$inferInsert;
export type ComponentLibrary = typeof componentLibraries.$inferSelect;
export type InsertComponentLibrary = typeof componentLibraries.$inferInsert;
export type BrandVoiceProfile = typeof brandVoiceProfiles.$inferSelect;
export type InsertBrandVoiceProfile = typeof brandVoiceProfiles.$inferInsert;
export type ContentExample = typeof contentExamples.$inferSelect;
export type InsertContentExample = typeof contentExamples.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type CopyPattern = typeof copyPatterns.$inferSelect;
export type InsertCopyPattern = typeof copyPatterns.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type InsertWorkspaceMember = typeof workspaceMembers.$inferInsert;
export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
export type InsertKnowledgeDocument = typeof knowledgeDocuments.$inferInsert;
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type InsertKnowledgeChunk = typeof knowledgeChunks.$inferInsert;
