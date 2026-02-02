import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { ENV } from "./_core/env";
import { conversations, messages, type Conversation, type InsertConversation, type Message, type InsertMessage } from "../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

const connection = mysql.createPool(ENV.databaseUrl);
const db = drizzle(connection);

// Conversation CRUD
export async function createConversation(data: InsertConversation) {
  const [conversation] = await db.insert(conversations).values(data).$returningId();
  return conversation.id;
}

export async function getConversationById(id: number) {
  const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
  return conversation;
}

export async function getConversationsByUserId(userId: number) {
  return db
    .select()
    .from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.isArchived, false)))
    .orderBy(desc(conversations.updatedAt));
}

export async function updateConversationTitle(id: number, title: string) {
  await db.update(conversations).set({ title, updatedAt: new Date() }).where(eq(conversations.id, id));
}

export async function archiveConversation(id: number) {
  await db.update(conversations).set({ isArchived: true }).where(eq(conversations.id, id));
}

// Message CRUD
export async function createMessage(data: InsertMessage) {
  const [message] = await db.insert(messages).values(data).$returningId();
  return message.id;
}

export async function getMessagesByConversationId(conversationId: number) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

export async function getConversationWithMessages(conversationId: number) {
  const conversation = await getConversationById(conversationId);
  if (!conversation) return null;
  
  const conversationMessages = await getMessagesByConversationId(conversationId);
  
  return {
    ...conversation,
    messages: conversationMessages,
  };
}
