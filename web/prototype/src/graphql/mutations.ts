import { gql } from '@apollo/client';

export const SIGN_IN = gql`
  mutation SignIn($input: SignInInput!) {
    auth {
      signIn(input: $input) {
        success
        message
        token
      }
    }
  }
`;

export const SIGN_UP = gql`
  mutation SignUp($input: SignUpInput!) {
    auth {
      signUp(input: $input) {
        success
        message
      }
    }
  }
`;

export const CREATE_PROJECT = gql`
  mutation CreateProject($input: CreateProjectInput!) {
    project {
      createProject(input: $input) {
        success
        message
        response {
          id
          name
        }
      }
    }
  }
`;

export const CREATE_TEAM = gql`
  mutation CreateTeam($input: CreateTeamInput!) {
    team {
      createTeam(input: $input) {
        success
        message
        response {
          id
          name
        }
      }
    }
  }
`;

export const CREATE_TASK = gql`
  mutation CreateTask($input: CreateTaskInput!) {
    task {
      createTask(input: $input) {
        success
        message
        response {
          id
          title
        }
      }
    }
  }
`;
