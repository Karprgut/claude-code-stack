import { getDb, COLLECTIONS } from "./mongodb";
import { ObjectId } from "mongodb";

// Add to COLLECTIONS
const CHAT_COLLECTIONS = {
  chatSessions: "chat_sessions",
  chatMessages: "chat_messages",
} as const;

export interface ChatSession {
  _id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  output: string;
  isError?: boolean;
}

export interface ChatImage {
  data: string;      // base64 encoded (no data URL prefix)
  mediaType: string; // e.g. "image/png", "image/jpeg"
}

export interface ChatMessage {
  _id?: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  images?: ChatImage[];
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp: string;
  model?: string;
  modelLabel?: string;
}

export async function createSession(title?: string): Promise<ChatSession> {
  const db = await getDb();
  const now = new Date().toISOString();
  const session: ChatSession = {
    _id: new ObjectId().toString(),
    title: title || "New conversation",
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  };
  await db.collection(CHAT_COLLECTIONS.chatSessions).insertOne(session as unknown as Record<string, unknown>);
  return session;
}

export async function getSessions(limit = 50): Promise<ChatSession[]> {
  const db = await getDb();
  return db
    .collection<ChatSession>(CHAT_COLLECTIONS.chatSessions)
    .find()
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();
}

export async function getSession(id: string): Promise<ChatSession | null> {
  const db = await getDb();
  return db.collection<ChatSession>(CHAT_COLLECTIONS.chatSessions).findOne({ _id: id } as any);
}

export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const db = await getDb();
  return db
    .collection<ChatMessage>(CHAT_COLLECTIONS.chatMessages)
    .find({ sessionId })
    .sort({ timestamp: 1 })
    .toArray();
}

export async function saveMessage(message: ChatMessage): Promise<void> {
  const db = await getDb();
  await db.collection(CHAT_COLLECTIONS.chatMessages).insertOne({
    ...message,
    _id: new ObjectId().toString(),
  } as any);
  await db.collection(CHAT_COLLECTIONS.chatSessions).updateOne(
    { _id: message.sessionId } as any,
    { $set: { updatedAt: message.timestamp }, $inc: { messageCount: 1 } }
  );
}

export async function updateSessionTitle(id: string, title: string): Promise<void> {
  const db = await getDb();
  await db.collection(CHAT_COLLECTIONS.chatSessions).updateOne(
    { _id: id } as any,
    { $set: { title } }
  );
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb();
  await db.collection(CHAT_COLLECTIONS.chatMessages).deleteMany({ sessionId: id });
  await db.collection(CHAT_COLLECTIONS.chatSessions).deleteOne({ _id: id } as any);
}
