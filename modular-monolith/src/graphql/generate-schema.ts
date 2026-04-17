import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { print } from 'graphql';
import { typeDefs } from './schema.ts';

/**
 * Generates a unified schema.graphql file from the modular schema components.
 */
async function generateSchema() {
    try {
        console.log('[Schema] Generating unified schema.graphql...');
        
        // typeDefs is already merged via mergeTypeDefs in schema.ts
        const schemaString = print(typeDefs);
        
        const outputPath = join(import.meta.dirname, '..', '..', 'schema.graphql');
        
        writeFileSync(outputPath, schemaString, 'utf8');
        
        console.log(`[Schema] Successfully generated: ${outputPath}`);
    } catch (err) {
        console.error('[Schema] Failed to generate schema:', err);
        process.exit(1);
    }
}

generateSchema().then(() => {
    process.exit(0);
});
