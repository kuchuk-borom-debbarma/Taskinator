import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: '../modular-monolith/schema.graphql',
  documents: 'src/**/*.{ts,tsx}',
  generates: {
    'src/gql/': {
      preset: 'client',
      plugins: [],
      config: {
        useTypeImports: true,
        enumsAsTypes: true
      }
    }
  }
};

export default config;
