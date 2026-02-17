import { gql } from '@apollo/client';

export const GET_ME = gql`
  query GetMe {
    me {
      id
      username
      projects {
        id
        name
        description
        createdAt
      }
    }
  }
`;

export const GET_PROJECT_DETAILS = gql`
  query GetProjectDetails($id: ID!) {
    project(input: { id: $id }) {
      id
      name
      description
      teams {
        id
        name
      }
      tasks {
        id
        title
        status
      }
    }
  }
`;
