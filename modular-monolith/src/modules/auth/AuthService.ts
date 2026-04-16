export interface StartSignUpParam {
    email: string;
    username: string;
    password_raw: string;
}

export interface SignInParam {
    email: string;
    password_raw: string;
}

export interface UserResult {
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

    /**
     * Cursor-paginated user search.
     * Matches username exactly OR id exactly.
     */
    searchUsers(
        params: SearchUsersParam,
    ): Promise<{ users: UserResult[]; nextCursor: string | null; prevCursor: string | null }>;

    /**
     * Batch fetch users by IDs. Used by DataLoaders.
     */
    getUsersByIds(ids: string[]): Promise<UserResult[]>;
}
