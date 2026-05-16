/**
 * @file ConditionHasher.ts
 * @description Provides structural hashing for Condition ASTs.
 * Ensures semantically identical conditions produce the same deterministic ID.
 *
 * @mandate COND-06
 */

import { createHash } from 'node:crypto';
import stringify from 'safe-stable-stringify';
import type { ConditionAST } from './types.js';

/**
 * Generates a deterministic SHA-256 hash for a given Condition AST.
 * Uses safe-stable-stringify to ensure key order does not affect the hash.
 *
 * @param ast The condition AST to hash.
 * @returns A 64-character hex string representing the hash.
 */
export function getConditionHash(ast: ConditionAST): string {
    // 1. Stringify the AST deterministically
    const stableJson = stringify(ast);

    // 2. Hash using SHA-256
    return createHash('sha256').update(stableJson).digest('hex');
}
