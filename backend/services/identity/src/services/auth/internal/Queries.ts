import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { users } from "../../../db/schemas/users";
import { SignUpParam } from "../IAuthService";

export const createUserQuery = async (data: SignUpParam) => {
  const db = getDb();

  return await db
    .insert(users)
    .values({
      displayName: data.displayName,
      email: data.email,
      username: data.username,
      password: data.password,
    })
    .returning();
};

export const findUserByFilter = async (filter: {
  username?: string;
  email?: string;
  id?: string;
}) => {
  const { username, email, id } = filter;
  const conditions = [];
  if (id) {
    conditions.push(eq(users.id, id));
  }
  if (username) {
    conditions.push(eq(users.username, username));
  }
  if (email) {
    conditions.push(eq(users.email, email));
  }
  if (conditions.length === 0) {
    throw new Error("No filters provided!");
  }

  const db = getDb();
  try {
    const found = await db
      .select()
      .from(users)
      .where(and(...conditions))
      .limit(1);

    return found;
  } catch (error: any) {
    console.error("Database error in findUserByFilter:", error);
    console.error("Filters used:", filter);
    throw error;
  }
};

export const updateUserQuery = async (
  id: string,
  update: Partial<SignUpParam>,
) => {
  const db = getDb();
  return await db
    .update(users)
    .set({
      ...update,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id));
};
