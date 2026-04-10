export interface StartSignUpParam {
    email: string;
    username: string;
    password_raw: string;
}

export interface SignInParam {
    email: string;
    password_raw: string;
}

export interface AuthService {
    init(): Promise<void>;

    destroy(): Promise<void>;

    startSignUp(data: StartSignUpParam): Promise<void>;

    finishSignUp(token: string): Promise<void>;

    signIn(data: SignInParam): Promise<{ token: string } | null>;
}
