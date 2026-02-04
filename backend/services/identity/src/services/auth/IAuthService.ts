export type User = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  createdAt: Date;
  updatedAt: Date | null;
};

export type SignUpParam = {
  email: string;
  password: string;
  username: string;
  displayName: string;
};

export interface IAuthService {
  updateUserById(data: {
    id: string;
    update: { password: string };
  }): Promise<void>;
  getUserByCredential(data: {
    key: string;
    method: "email" | "user";
    password: string;
  }): Promise<User | null>;

  getUserByFilter(filter: {
    username?: string;
    id?: string;
    email?: string;
  }): Promise<User | null>;

  createUserJWEToken(data: SignUpParam): Promise<string>;

  verifyUserFromJWEToken(token: string): Promise<SignUpParam | undefined>;

  createUser(userData: SignUpParam): Promise<void>;
}
