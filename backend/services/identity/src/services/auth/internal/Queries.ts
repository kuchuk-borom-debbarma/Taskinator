import { getDb } from "../../../db";
import { users } from "../../../db/schemas/users";
import { SignUpParam } from "../IAuthService";

export const createUserQuery = async (data: SignUpParam) => {
  const db = getDb();

  const added = await db
    .insert(users)
    .values({
      displayName: data.displayName,
      email: data.email,
      username: data.username,
      password: data.password,
    })
    .returning();
};
