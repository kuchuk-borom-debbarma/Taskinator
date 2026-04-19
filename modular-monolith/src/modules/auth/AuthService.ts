export interface StartSignUpParam {
    email: string;
    username: string;
    password_raw: string;
}

export interface SignInParam {
    email: string;
    password_raw: string;
}

export interface User {
    id: string;
    username: string;
    email: string;
}

export interface SearchUsersParam {
    /** Exact username match OR exact UUID match */
    search?: string;
    first?: number;
    after?: string;
    last?: number;
    before?: string;
    /** ID of the user performing the search (to exclude from results) */
    actorId?: string;
}

export interface AuthService {
    init(): Promise<void>;

    destroy(): Promise<void>;

    startSignUp(data: StartSignUpParam): Promise<void>;

    finishSignUp(token: string): Promise<void>;

    signIn(data: SignInParam): Promise<{ token: string } | null>;

    searchUsers(params: SearchUsersParam): Promise<{
        users: User[];
        nextCursor: string | null;
        prevCursor: string | null;
    }>;

    /**
     * Batch fetch users by IDs.
     */
    getUsersByIds(ids: string[]): Promise<User[]>;
}
