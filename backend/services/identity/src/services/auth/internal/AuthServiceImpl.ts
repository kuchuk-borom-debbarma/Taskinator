import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { users } from "../../../db/schemas/users";
import { hashPassword, verifyPassword } from "../../../util/crypto";
import { createJwe, decryptJwe } from "../../../util/jwe";
import { IAuthService, SignUpParam, User } from "../IAuthService";
import { createUserQuery, findUserByFilter, updateUserQuery } from "./Queries";

export class AuthServiceImpl implements IAuthService {
  async updateUserById(data: {
    id: string;
    update: { password: string };
  }): Promise<void> {
    const hashed = await hashPassword(data.update.password);
    await updateUserQuery(data.id, { password: hashed });
  }

  async getUserByFilter(filter: {
    username?: string;
    id?: string;
    email?: string;
  }): Promise<User | null> {
    const result = await findUserByFilter(filter);
    if (result.length === 0) {
      return null;
    }
    const user = result[0];
    return {
      createdAt: user.createdAt,
      displayName: user.displayName,
      email: user.email,
      id: user.id,
      updatedAt: user.updatedAt,
      username: user.username,
    };
  }
  async getUserByCredential(data: {
    key: string;
    method: "email" | "user";
    password: string;
  }): Promise<User | null> {
    const filter: any = {};
    if (data.method === "email") {
      filter.email = data.key;
    } else {
      filter.username = data.key;
    }

    const result = await findUserByFilter(filter);

    if (result.length === 0) {
      console.warn("User not found");
      return null;
    }

    const user = result[0];

    //validate cred
    if (await verifyPassword(data.password, user.password)) {
      return user;
    }

    console.warn("Invalid credential");
    return null;
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
    await createUserQuery(userData);
  }
}
