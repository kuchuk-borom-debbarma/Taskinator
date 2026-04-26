export const SIGN_IN = `
    mutation SignIn($email: String!, $password_raw: String!) {
        signIn(email: $email, password_raw: $password_raw) {
            token
        }
    }
`;
