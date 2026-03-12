import { db } from "../../src/db";
import { users } from "../../src/db/schema";
import type { NewUser } from "../../src/db/schema";

export async function cleanDb() {
  await db.delete(users).execute();
}

export async function createTestUser(
  data: Omit<NewUser, "id" | "createdAt">,
): Promise<NewUser> {
  const [user] = await db.insert(users).values(data).returning();
  return user;
}

export async function getAllUsers() {
  return await db.select().from(users);
}
