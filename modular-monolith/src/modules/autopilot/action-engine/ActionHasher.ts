/**
 * @file ActionHasher.ts
 * @description Provides structural hashing for Action ASTs.
 * Ensures semantically identical actions produce the same deterministic ID.
 */

import { createHash } from 'node:crypto';
import stringify from 'safe-stable-stringify';
import type { ActionAST } from './types.js';

/**
 * Generates a deterministic SHA-256 hash for a given Action AST.
 * Uses safe-stable-stringify to ensure key order does not affect the hash.
 *
 * @param ast The action AST to hash.
 * @returns A 64-character hex string representing the hash.
 */
export function getActionHash(ast: ActionAST): string {
    // 1. Stringify the AST deterministically
    const stableJson = stringify(ast);

    // 2. Hash using SHA-256
    return createHash('sha256').update(stableJson).digest('hex');
}
