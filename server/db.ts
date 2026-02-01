import { and, desc, eq, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  Generation,
  InsertGeneration,
  InsertProject,
  InsertTeam,
  InsertTeamMember,
  InsertUser,
  InsertUsageAnalytics,
  Project,
  Team,
  TeamMember,
  UsageAnalytics,
  DesignSystem,
  InsertDesignSystem,
  ComponentLibrary,
  InsertComponentLibrary,
  BrandVoiceProfile,
  InsertBrandVoiceProfile,
  ContentExample,
  InsertContentExample,
  generations,
  projects,
  teamMembers,
  teams,
  usageAnalytics,
  users,
  designSystems,
  componentLibraries,
  brandVoiceProfiles,
  contentExamples,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== User Queries ====================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserSubscription(
  userId: number,
  data: {
    stripeCustomerId?: string;
    subscriptionTier?: "free" | "pro" | "team" | "business" | "enterprise";
    subscriptionStatus?: "active" | "canceled" | "past_due" | "trialing";
    subscriptionId?: string;
    currentPeriodEnd?: Date;
  }
) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set(data).where(eq(users.id, userId));
}

export async function incrementUserGenerations(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(users)
    .set({
      generationsThisMonth: sql`${users.generationsThisMonth} + 1`,
      generationsTotal: sql`${users.generationsTotal} + 1`,
    })
    .where(eq(users.id, userId));
}

export async function resetMonthlyGenerations(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(users)
    .set({
      generationsThisMonth: 0,
      lastResetDate: new Date(),
    })
    .where(eq(users.id, userId));
}

// ==================== Team Queries ====================

export async function createTeam(team: InsertTeam): Promise<Team | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(teams).values(team);
  const teamId = Number(result[0].insertId);

  // Add owner as team member
  await db.insert(teamMembers).values({
    teamId,
    userId: team.ownerId,
    role: "owner",
  });

  return getTeamById(teamId);
}

export async function getTeamById(teamId: number): Promise<Team | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserTeams(userId: number): Promise<Team[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({ team: teams })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, userId));

  return result.map((r) => r.team);
}

export async function updateTeamBrandVoice(
  teamId: number,
  data: {
    brandVoicePreset?: string;
    brandVoiceCustom?: string;
    brandGuidelines?: string;
  }
) {
  const db = await getDb();
  if (!db) return;

  await db.update(teams).set(data).where(eq(teams.id, teamId));
}

export async function getTeamMembers(teamId: number): Promise<(TeamMember & { user: { name: string | null; email: string | null } })[]> {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      member: teamMembers,
      user: {
        name: users.name,
        email: users.email,
      },
    })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId));

  return result.map((r) => ({ ...r.member, user: r.user }));
}

export async function addTeamMember(member: InsertTeamMember) {
  const db = await getDb();
  if (!db) return;

  await db.insert(teamMembers).values(member);
}

// ==================== Project Queries ====================

export async function createProject(project: InsertProject): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(projects).values(project);
  const projectId = Number(result[0].insertId);
  return getProjectById(projectId);
}

export async function getProjectById(projectId: number): Promise<Project | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserProjects(userId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(projects).where(and(eq(projects.userId, userId), eq(projects.isArchived, false))).orderBy(desc(projects.updatedAt));
}

export async function getTeamProjects(teamId: number): Promise<Project[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(projects).where(and(eq(projects.teamId, teamId), eq(projects.isArchived, false))).orderBy(desc(projects.updatedAt));
}

export async function updateProject(projectId: number, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) return;

  await db.update(projects).set(data).where(eq(projects.id, projectId));
}

export async function archiveProject(projectId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(projects).set({ isArchived: true }).where(eq(projects.id, projectId));
}

// ==================== Generation Queries ====================

export async function createGeneration(generation: InsertGeneration): Promise<Generation | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.insert(generations).values(generation);
  const generationId = Number(result[0].insertId);
  return getGenerationById(generationId);
}

export async function getGenerationById(generationId: number): Promise<Generation | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(generations).where(eq(generations.id, generationId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserGenerations(userId: number, limit: number = 50): Promise<Generation[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(generations).where(eq(generations.userId, userId)).orderBy(desc(generations.createdAt)).limit(limit);
}

export async function getProjectGenerations(projectId: number): Promise<Generation[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(generations).where(eq(generations.projectId, projectId)).orderBy(desc(generations.createdAt));
}

export async function getUserLibrary(userId: number): Promise<Generation[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(generations).where(and(eq(generations.userId, userId), eq(generations.isInLibrary, true))).orderBy(desc(generations.createdAt));
}

export async function updateGeneration(generationId: number, data: Partial<InsertGeneration>) {
  const db = await getDb();
  if (!db) return;

  await db.update(generations).set(data).where(eq(generations.id, generationId));
}

export async function toggleFavorite(generationId: number, isFavorite: boolean) {
  const db = await getDb();
  if (!db) return;

  await db.update(generations).set({ isFavorite }).where(eq(generations.id, generationId));
}

export async function toggleLibrary(generationId: number, isInLibrary: boolean) {
  const db = await getDb();
  if (!db) return;

  await db.update(generations).set({ isInLibrary }).where(eq(generations.id, generationId));
}

// ==================== Analytics Queries ====================

export async function recordUsage(analytics: InsertUsageAnalytics) {
  const db = await getDb();
  if (!db) return;

  await db.insert(usageAnalytics).values(analytics);
}

export async function getUserAnalytics(userId: number, days: number = 30): Promise<UsageAnalytics[]> {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return db.select().from(usageAnalytics).where(and(eq(usageAnalytics.userId, userId), gte(usageAnalytics.date, startDate))).orderBy(desc(usageAnalytics.date));
}

export async function getTeamAnalytics(teamId: number, days: number = 30): Promise<UsageAnalytics[]> {
  const db = await getDb();
  if (!db) return [];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return db.select().from(usageAnalytics).where(and(eq(usageAnalytics.teamId, teamId), gte(usageAnalytics.date, startDate))).orderBy(desc(usageAnalytics.date));
}

// ==================== Admin Queries ====================

export async function getAllUsers(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit);
}

export async function getTotalUsers(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select({ count: sql<number>`count(*)` }).from(users);
  return result[0]?.count ?? 0;
}

export async function getTotalGenerations(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select({ count: sql<number>`count(*)` }).from(generations);
  return result[0]?.count ?? 0;
}


// ==================== Design System Queries ====================

export async function createDesignSystem(data: InsertDesignSystem): Promise<DesignSystem> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(designSystems).values(data);
  const id = Number(result[0].insertId);

  const created = await db.select().from(designSystems).where(eq(designSystems.id, id)).limit(1);
  if (!created[0]) throw new Error("Failed to create design system");

  return created[0];
}

export async function getDesignSystemsByUser(userId: number): Promise<DesignSystem[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(designSystems).where(eq(designSystems.userId, userId)).orderBy(desc(designSystems.createdAt));
}

export async function getDesignSystemById(id: number): Promise<DesignSystem | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(designSystems).where(eq(designSystems.id, id)).limit(1);
  return result[0];
}

export async function updateDesignSystem(id: number, data: Partial<InsertDesignSystem>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(designSystems).set(data).where(eq(designSystems.id, id));
}

export async function deleteDesignSystem(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete related records first
  await db.delete(contentExamples).where(eq(contentExamples.designSystemId, id));
  await db.delete(brandVoiceProfiles).where(eq(brandVoiceProfiles.designSystemId, id));
  await db.delete(componentLibraries).where(eq(componentLibraries.designSystemId, id));
  await db.delete(designSystems).where(eq(designSystems.id, id));
}

// ==================== Component Library Queries ====================

export async function createComponentLibrary(data: InsertComponentLibrary): Promise<ComponentLibrary> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(componentLibraries).values(data);
  const id = Number(result[0].insertId);

  const created = await db.select().from(componentLibraries).where(eq(componentLibraries.id, id)).limit(1);
  if (!created[0]) throw new Error("Failed to create component library");

  return created[0];
}

export async function getComponentLibrariesByDesignSystem(designSystemId: number): Promise<ComponentLibrary[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(componentLibraries).where(eq(componentLibraries.designSystemId, designSystemId));
}

// ==================== Brand Voice Profile Queries ====================

export async function createBrandVoiceProfile(data: InsertBrandVoiceProfile): Promise<BrandVoiceProfile> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(brandVoiceProfiles).values(data);
  const id = Number(result[0].insertId);

  const created = await db.select().from(brandVoiceProfiles).where(eq(brandVoiceProfiles.id, id)).limit(1);
  if (!created[0]) throw new Error("Failed to create brand voice profile");

  return created[0];
}

export async function getBrandVoiceProfilesByDesignSystem(designSystemId: number): Promise<BrandVoiceProfile[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(brandVoiceProfiles).where(eq(brandVoiceProfiles.designSystemId, designSystemId));
}

// ==================== Content Example Queries ====================

export async function createContentExample(data: InsertContentExample): Promise<ContentExample> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(contentExamples).values(data);
  const id = Number(result[0].insertId);

  const created = await db.select().from(contentExamples).where(eq(contentExamples.id, id)).limit(1);
  if (!created[0]) throw new Error("Failed to create content example");

  return created[0];
}

export async function getContentExamplesByDesignSystem(designSystemId: number, type?: string): Promise<ContentExample[]> {
  const db = await getDb();
  if (!db) return [];

  if (type) {
    return db
      .select()
      .from(contentExamples)
      .where(and(eq(contentExamples.designSystemId, designSystemId), eq(contentExamples.type, type as any)))
      .orderBy(desc(contentExamples.createdAt));
  }

  return db.select().from(contentExamples).where(eq(contentExamples.designSystemId, designSystemId)).orderBy(desc(contentExamples.createdAt));
}

export async function bulkCreateContentExamples(examples: InsertContentExample[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (examples.length === 0) return;

  await db.insert(contentExamples).values(examples);
}
