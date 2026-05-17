import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { CONFIG } from '../config';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { print } from 'graphql';

export const useGraphQLClient = () => {
  const { token } = useAuth();

  const request = useCallback(async <TResult, TVariables>(
    document: TypedDocumentNode<TResult, TVariables>,
    variables?: TVariables
  ): Promise<TResult> => {
    const response = await fetch(CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        query: print(document),
        variables,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Handle unauthorized (optional: auto-logout)
        throw new Error('Unauthorized');
      }
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const { data, errors } = await response.json();
    if (errors) {
      throw new Error(errors[0].message);
    }

    return data;
  }, [token]);

  return { request };
};
