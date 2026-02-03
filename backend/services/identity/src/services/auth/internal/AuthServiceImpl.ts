import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { users } from "../../../db/schemas/users";
import { hashPassword } from "../../../util/crypto";
import { createJwe, decryptJwe } from "../../../util/jwe";
import { IAuthService, SignUpParam, User } from "../IAuthService";
import { createUserQuery } from "./Queries";

export class AuthServiceImpl implements IAuthService {
  async getUserByCredential(data: {
    key: string;
    method: "email" | "user";
    password: string;
  }): Promise<User | null> {
    let user: User | null = null;
    const db = getDb();
    const query = db.select().from(users);
    let result: {
      id: string;
      username: string;
      displayName: string;
      email: string;
      password: string;
      createdAt: Date;
      updatedAt: Date | null;
    }[] = [];
    if (data.method === "email") {
      result = await query.where(eq(users.email, data.key));
    } else {
      result = await query.where(eq(users.username, data.key));
    }

    if (result === undefined || result.length !== 1) {
      console.warn("User not found");
      return null;
    }

    const firstResult = result[0];

    return {
      id: firstResult.id,
      displayName: firstResult.displayName,
      username: firstResult.username,
      email: firstResult.email,
      createdAt: firstResult.createdAt,
      updatedAt: firstResult.updatedAt,
    };
  }

  getUserByFilter(filter: {
    email?: string;
    username?: string;
    id?: string;
  }): User | null {
    throw new Error("Method not implemented.");
  }

  async createUserJWEToken(data: SignUpParam): Promise<string> {
    const encryptedJWE = await createJwe(JSON.stringify(data));
    return encryptedJWE;
  }

  async verifyUserFromJWEToken(
    token: string,
  ): Promise<SignUpParam | undefined> {
    try {
      const data = (await decryptJwe(token)) as string;
      const data2 = JSON.parse(data) as SignUpParam;
      return data2;
    } catch (error) {
      console.error("Error decrypting JWE token:", error);
      return undefined;
    }
  }

  async createUser(userData: SignUpParam): Promise<void> {
    const hashed = await hashPassword(userData.password);
    userData.password = hashed;
    const result = await createUserQuery(userData);
  }
}
