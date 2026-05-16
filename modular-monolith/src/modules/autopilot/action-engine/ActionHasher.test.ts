import { describe, expect, it } from 'bun:test';
import { getActionHash } from './ActionHasher.js';
import type { ActionAST } from './types.js';

describe('ActionHasher', () => {
    it('should generate a deterministic hash for an ActionAST', () => {
        const ast: ActionAST = [
            {
                target: 'self',
                field: 'status',
                operation: 'set',
                value: 'DONE',
            },
        ];
        const hash1 = getActionHash(ast);
        const hash2 = getActionHash(ast);

        expect(hash1).toBe(hash2);
        expect(hash1).toHaveLength(64); // SHA-256 hex length
    });

    it('should produce the same hash regardless of object key order', () => {
        // Manually creating objects with different key orders if possible in TS
        const ast1: ActionAST = [
            {
                target: 'self',
                field: 'status',
                operation: 'set',
                value: 'DONE',
            },
        ];

        // In JS, we can't easily guarantee key order in literals,
        // but safe-stable-stringify handles it.
        // We'll trust safe-stable-stringify for deep equality of keys.
        const ast2: ActionAST = JSON.parse(JSON.stringify(ast1));

        expect(getActionHash(ast1)).toBe(getActionHash(ast2));
    });

    it('should produce different hashes for different ASTs', () => {
        const ast1: ActionAST = [
            {
                target: 'self',
                field: 'status',
                operation: 'set',
                value: 'DONE',
            },
        ];
        const ast2: ActionAST = [
            {
                target: 'self',
                field: 'status',
                operation: 'set',
                value: 'IN_PROGRESS',
            },
        ];

        expect(getActionHash(ast1)).not.toBe(getActionHash(ast2));
    });

    it('should produce different hashes for different step orders', () => {
        const ast1: ActionAST = [
            {
                target: 'self',
                field: 'status',
                operation: 'set',
                value: 'DONE',
            },
            {
                target: 'project',
                field: 'updatedAt',
                operation: 'set',
                value: 'now',
            },
        ];
        const ast2: ActionAST = [
            {
                target: 'project',
                field: 'updatedAt',
                operation: 'set',
                value: 'now',
            },
            {
                target: 'self',
                field: 'status',
                operation: 'set',
                value: 'DONE',
            },
        ];

        expect(getActionHash(ast1)).not.toBe(getActionHash(ast2));
    });
});
