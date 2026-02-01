import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Projects Router", () => {
  it("creates a project with valid input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const project = await caller.projects.create({
      name: "Test Project",
      description: "A test project",
    });

    expect(project).toHaveProperty("id");
    expect(project.name).toBe("Test Project");
    expect(project.description).toBe("A test project");
    expect(project.userId).toBe(1);
  });

  it("lists user projects", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a project first
    await caller.projects.create({
      name: "Project 1",
    });

    const projects = await caller.projects.list();

    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBeGreaterThan(0);
    expect(projects[0]).toHaveProperty("name");
  });

  it("updates project details", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const project = await caller.projects.create({
      name: "Original Name",
    });

    const result = await caller.projects.update({
      id: project.id,
      name: "Updated Name",
      description: "New description",
    });

    expect(result.success).toBe(true);
  });

  it("archives a project", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const project = await caller.projects.create({
      name: "To Archive",
    });

    const result = await caller.projects.archive({
      id: project.id,
    });

    expect(result.success).toBe(true);
  });
});
